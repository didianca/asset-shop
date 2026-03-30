import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as logs from "aws-cdk-lib/aws-logs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export class AssetShopStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ── VPC ──────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // ── RDS ──────────────────────────────────────────────────────────
    const db = new rds.DatabaseInstance(this, "Db", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      credentials: rds.Credentials.fromGeneratedSecret("postgres"),
      databaseName: "assetshop",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    // ── ECS Cluster ─────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    // ── Docker Image ────────────────────────────────────────────────
    const image = new ecr_assets.DockerImageAsset(this, "AppImage", {
      directory: path.join(__dirname, "..", ".."),
      file: "api/Dockerfile",
      target: "production",
      buildArgs: {
        VITE_STRIPE_PK: process.env.VITE_STRIPE_PK ?? "",
      },
      platform: ecr_assets.Platform.LINUX_AMD64,
    });

    // ── Task Definition ─────────────────────────────────────────────
    const taskDef = new ecs.FargateTaskDefinition(this, "TaskDef", {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDef.addContainer("app", {
      image: ecs.ContainerImage.fromDockerImageAsset(image),
      portMappings: [{ containerPort: 3000 }],
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "asset-shop",
        logRetention: logs.RetentionDays.ONE_WEEK,
      }),
      environment: {
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL: process.env.DATABASE_URL ?? "",
        JWT_SECRET: process.env.JWT_SECRET ?? "",
        AWS_REGION: process.env.CDK_DEFAULT_REGION ?? "",
        AWS_SES_ACCESS_KEY: process.env.AWS_SES_ACCESS_KEY ?? "",
        AWS_SES_SECRET_ACCESS_KEY: process.env.AWS_SES_SECRET_ACCESS_KEY ?? "",
        SES_FROM_EMAIL: process.env.SES_FROM_EMAIL ?? "",
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "",
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? "",
        AWS_S3_ACCESS_KEY: process.env.AWS_S3_ACCESS_KEY ?? "",
        AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY ?? "",
        AWS_S3_REGION: process.env.AWS_S3_REGION ?? "",
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME ?? "",
        API_URL: process.env.API_URL ?? "",
      },
    });

    // ── Route 53 + ACM ────────────────────────────────────────────
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, "Zone", {
      hostedZoneId: "Z0364396AU45HBH4D2H5",
      zoneName: "asset-shop.com",
    });

    const certificate = new acm.Certificate(this, "Cert", {
      domainName: "asset-shop.com",
      subjectAlternativeNames: ["*.asset-shop.com"],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // ── ALB + Fargate Service ───────────────────────────────────────
    const fargateService =
      new ecs_patterns.ApplicationLoadBalancedFargateService(this, "Service", {
        cluster,
        taskDefinition: taskDef,
        desiredCount: 1,
        assignPublicIp: true,
        publicLoadBalancer: true,
        certificate,
        domainName: "asset-shop.com",
        domainZone: zone,
        redirectHTTP: true,
      });

    fargateService.targetGroup.configureHealthCheck({
      path: "/api/health",
    });

    db.connections.allowFrom(
      fargateService.service,
      ec2.Port.tcp(5432),
      "ECS to RDS",
    );

    // ── Outputs ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "AppUrl", {
      value: "https://asset-shop.com",
    });

    new cdk.CfnOutput(this, "RdsEndpoint", {
      value: db.dbInstanceEndpointAddress,
    });

    new cdk.CfnOutput(this, "RdsSecretArn", {
      value: db.secret!.secretArn,
      description:
        "Retrieve credentials with: aws secretsmanager get-secret-value --secret-id <arn>",
    });
  }
}
