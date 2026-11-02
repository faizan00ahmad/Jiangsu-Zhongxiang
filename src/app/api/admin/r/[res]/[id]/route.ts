import { resourceDelete, resourceUpdate } from "@/lib/server/resourceApi";

type Ctx = { params: Promise<{ res: string; id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { res, id } = await ctx.params;
  return resourceUpdate(req, res, id);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { res, id } = await ctx.params;
  return resourceDelete(res, id);
}
