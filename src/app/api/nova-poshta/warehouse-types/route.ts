import { NextResponse } from "next/server";

const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const API_KEY = process.env.NOVA_POST_API_KEY ?? "";

export async function GET() {
  const res = await fetch(NP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: API_KEY,
      modelName: "AddressGeneral",
      calledMethod: "getWarehouseTypes",
      methodProperties: {},
    }),
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nova Poshta API error" }, { status: 502 });
  }

  const data = await res.json();

  if (!data.success) {
    return NextResponse.json({ error: data.errors?.[0] ?? "API error" }, { status: 400 });
  }

  const types = (data.data as any[]).map((t) => ({
    ref: t.Ref,
    description: t.Description,
  }));

  return NextResponse.json(types);
}
