import { NextRequest, NextResponse } from "next/server";

const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const API_KEY = process.env.NOVA_POST_API_KEY ?? "";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "20";

  const body = {
    apiKey: API_KEY,
    modelName: "AddressGeneral",
    calledMethod: "getCities",
    methodProperties: {
      FindByString: query,
      Page: page,
      Limit: limit,
    },
  };

  const res = await fetch(NP_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 86400 }, // cache 24h
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Nova Poshta API error" }, { status: 502 });
  }

  const data = await res.json();

  if (!data.success) {
    return NextResponse.json({ error: data.errors?.[0] ?? "API error" }, { status: 400 });
  }

  const cities = (data.data as any[]).map((c) => ({
    ref: c.Ref,
    name: c.Description,
    area: c.Area,
    settlementType: c.SettlementTypeDescription,
  }));

  return NextResponse.json(cities);
}
