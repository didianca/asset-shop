#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AssetShopStack } from "../lib/stack";

const app = new cdk.App();

new AssetShopStack(app, "AssetShopStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
