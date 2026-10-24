import { readdir } from "node:fs/promises";
import path from "node:path";
import CinemaHero from "@/components/home/CinemaHero";
import Compare from "@/components/home/Compare";
import CoreEntries from "@/components/home/CoreEntries";
import HomeHero from "@/components/home/HomeHero";
import { ExploreProducts, Riders, Stories, TwoCards } from "@/components/home/HomeSections";
import { siteData } from "@/lib/server/queries";

/** Real cinematic photos (rider in a helmet, motion blur…) dropped in public/hero/<model-slug>.jpg|webp|png take over that hero slide. */
async function heroScenes() {
  const out: Record<string, string> = {};
  try {
    for (const f of await readdir(path.join(process.cwd(), "public", "hero"))) {
      const m = /^(.+)\.(jpe?g|webp|png|avif)$/i.exec(f);
      if (m) out[m[1].toLowerCase()] = `/hero/${f}`;
    }
  } catch {
    // no folder yet: the studio cut-outs are used
  }
  return out;
}

export default async function Home() {
  const { db, models, colors } = await siteData();
  const scenes = await heroScenes();
  const cities = new Set(db.dealers.filter((d) => d.enabled).map((d) => d.city)).size;
  return (
    <>
      <CinemaHero models={models} scenes={scenes} />
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
