import HomeHero from "@/components/home/HomeHero";
import { CoreEntries, ExploreProducts, Riders, Stories, TwoCards } from "@/components/home/HomeSections";
import { siteData } from "@/lib/server/queries";

export default async function Home() {
  const { db, models, colors } = await siteData();
  return (
    <>
      <HomeHero models={models} colors={colors} title={db.settings.heroTitle} text={db.settings.heroText} />
      <CoreEntries />
      <ExploreProducts models={models} colors={colors} />
      <Riders models={models} colors={colors} />
      <Stories models={models} colors={colors} />
      <TwoCards models={models} colors={colors} />
    </>
  );
}
