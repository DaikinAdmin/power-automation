import { NextRequest, NextResponse } from "next/server";

const NP_API_URL = "https://api.novaposhta.ua/v2.0/json/";
const API_KEY = process.env.NOVA_POST_API_KEY ?? "";

// TypeOfWarehouseRef values (from Nova Poshta):
// Warehouse (Branch):  841339c7-591a-42e2-8233-7a0a00f0ed6f
// Postomat:            f9316480-5f64-43d0-a02a-96f4b9f9e5d0
// PostMachine (parcel locker): 9a68df70-0267-42a8-bb5c-37f427e36ee4

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const cityRef = searchParams.get("cityRef") ?? "";
  const cityName = searchParams.get("cityName") ?? "";
  const findByString = searchParams.get("q") ?? "";
  const page = searchParams.get("page") ?? "1";
  const limit = searchParams.get("limit") ?? "50";

  const methodProperties: Record<string, string> = {
    Page: page,
    Limit: limit,
    Language: "UA",
  };

  if (cityRef) methodProperties.CityRef = cityRef;
  if (cityName) methodProperties.CityName = cityName;
  if (findByString) methodProperties.FindByString = findByString;

  const body = {
    apiKey: API_KEY,
    modelName: "AddressGeneral",
    calledMethod: "getWarehouses",
    methodProperties,
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

  const warehouses = (data.data as any[]).map((w) => ({
    ref: w.Ref,
    number: w.Number,
    description: w.Description,
    shortAddress: w.ShortAddress,
    cityRef: w.CityRef,
    cityDescription: w.CityDescription,
    typeOfWarehouse: w.TypeOfWarehouse,
    schedule: w.Schedule,
    posTerminal: w.POSTerminal === "1",
    postFinance: w.PostFinance === "1",
    onlyReceiving: w.OnlyReceivingParcel === "1",
    postMachineType: w.PostMachineType,
  }));

  return NextResponse.json(warehouses);
}
