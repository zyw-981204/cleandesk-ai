import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const store = await getStore();
  const [services, addons] = await Promise.all([store.listServices(), store.listAddons()]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm text-brass">Catalog</p>
        <h1 className="font-serif text-4xl text-spruce-deep">Services and pricing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Quote = base + square feet + bedrooms + bathrooms + add-ons. The assistant uses this same formula, so a chat quote matches the card on this page.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-2">
        {services.map((service) => (
          <Card key={service.slug} data-testid={`service-${service.slug}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{service.name}</CardTitle>
                <Badge>{service.durationHours}h work</Badge>
              </div>
              <p className="text-sm text-muted">{service.summary}</p>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted">Base</dt>
                  <dd className="font-medium">{formatCents(service.baseCents)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Per sq ft</dt>
                  <dd className="font-medium">{formatCents(service.perSqftCents)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Bedroom</dt>
                  <dd className="font-medium">{formatCents(service.perBedroomCents)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Bathroom</dt>
                  <dd className="font-medium">{formatCents(service.perBathroomCents)}</dd>
                </div>
              </dl>
              <ul className="mt-4 space-y-1 text-sm text-muted">
                {service.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <section>
        <h2 className="font-serif text-3xl text-spruce-deep">Add-ons</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {addons.map((addon) => (
            <Card key={addon.slug}>
              <CardContent className="pt-5">
                <p className="font-medium">{addon.name}</p>
                <p className="text-sm text-muted">{addon.summary}</p>
                <p className="mt-2 font-serif text-2xl text-spruce">{formatCents(addon.priceCents)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
