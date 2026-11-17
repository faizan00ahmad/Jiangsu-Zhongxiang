import { SITE_DICT } from "@/i18n/site";
import BuyNow from "@/components/cart/BuyNow";
import { getLang } from "@/lib/server/session";

export async function generateMetadata() {
  return { title: SITE_DICT[await getLang()].checkout.title, robots: { index: false } };
}

/** "Buy now" from a quotation: that one bike becomes the cart and the customer goes straight to checkout. */
export default async function BuyNowPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  return <BuyNow quoteId={quoteId} />;
}
