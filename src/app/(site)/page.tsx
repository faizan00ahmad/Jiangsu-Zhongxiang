import Compare from "@/components/home/Compare";
import CoreEntries from "@/components/home/CoreEntries";
import HomeHero from "@/components/home/HomeHero";
import { ExploreProducts, Riders, Stories, TwoCards } from "@/components/home/HomeSections";
import { siteData } from "@/lib/server/queries";

export default async function Home() {
  const { db, models, colors } = await siteData();
  const cities = new Set(db.dealers.filter((d) => d.enabled).map((d) => d.city)).size;
  return (
    <>
      <HomeHero models={models} colors={colors} title={db.settings.heroTitle} text={db.settings.heroText} />
      <CoreEntries models={models.length} cities={cities} />
      <ExploreProducts models={models} colors={colors} />
      <Compare models={models} colors={colors} />
      <Riders models={models} colors={colors} />
      <Stories models={models} colors={colors} />
      <TwoCards models={models} colors={colors} />
    </>
  );
}
