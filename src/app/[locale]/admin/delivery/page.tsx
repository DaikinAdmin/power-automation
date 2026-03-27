import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DeliveryPage() {
  const t = await getTranslations('adminDashboard');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('delivery.title')}</h1>
        <p className="text-gray-600">
          {t('delivery.description')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('delivery.stats.active')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('delivery.stats.today')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('delivery.stats.pending')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('delivery.stats.avgTime')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2</div>
            <p className="text-xs text-gray-600">{t('delivery.stats.days')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('delivery.shipping.title')}</CardTitle>
            <CardDescription>
              {t('delivery.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{t('delivery.shipping.standard')}</h4>
                  <p className="text-sm text-gray-600">5-7 {t('delivery.shipping.days')}</p>
                </div>
                <span className="text-green-600 text-sm">{t('delivery.shipping.enabled')}</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{t('delivery.shipping.express')}</h4>
                  <p className="text-sm text-gray-600">2-3 {t('delivery.shipping.days')}</p>
                </div>
                <span className="text-green-600 text-sm">{t('delivery.shipping.enabled')}</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{t('delivery.shipping.pickup')}</h4>
                  <p className="text-sm text-gray-600">1 {t('delivery.shipping.days')}</p>
                </div>
                <span className="text-yellow-600 text-sm">{t('delivery.shipping.disabled')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('delivery.carriers.title')}</CardTitle>
            <CardDescription>
              {t('delivery.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-brown-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">UPS</span>
                  </div>
                  <span className="font-medium">UPS</span>
                </div>
                <span className="text-green-600 text-sm">{t('delivery.carriers.active')}</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">FX</span>
                  </div>
                  <span className="font-medium">FedEx</span>
                </div>
                <span className="text-green-600 text-sm">{t('delivery.carriers.active')}</span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">DH</span>
                  </div>
                  <span className="font-medium">{t('delivery.carriers.dhl')}</span>
                </div>
                <span className="text-gray-600 text-sm">{t('delivery.carriers.inactive')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
