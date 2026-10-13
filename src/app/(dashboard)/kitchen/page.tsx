import { KitchenDisplay } from './components/KitchenDisplay';

export default function KitchenPage() {
  return (
    <KitchenDisplay stationId="main" maxOrders={20} />
  );
}