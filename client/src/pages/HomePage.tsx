import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useProductStore } from "../stores/productStore";
import { ROUTES } from "../lib/constants";
import FeaturedSection from "../components/products/FeaturedSection";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function HomePage() {
  const { products, isLoading, fetchProducts } = useProductStore();

  useEffect(() => {
    if (products.length === 0) fetchProducts();
  }, [products.length, fetchProducts]);

  const discounted = products.filter(
    (p) => p.discountPercent && p.discountPercent > 0,
  );
  const newest = [...products]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-linear-to-r from-indigo-600 to-purple-600 px-8 py-16 text-center text-white">
        <h1 className="text-4xl font-bold sm:text-5xl">
          Digital Assets
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-100">
          Pixel art like digital assets for personal use.
        </p>
        <Link to={ROUTES.CATALOG} className="mt-8 inline-block">
          <Button
            size="lg"
            className="bg-white text-indigo-600 hover:bg-indigo-50"
          >
            Browse Catalog
          </Button>
        </Link>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {discounted.length > 0 && (
            <FeaturedSection title="On Sale" products={discounted} />
          )}
          <FeaturedSection title="Latest Additions" products={newest} />
        </>
      )}
    </div>
  );
}
