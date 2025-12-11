import { redirect } from 'next/navigation';

export default function CheckoutPage() {
  // Redirect to the default locale checkout page
  redirect('/pl/checkout');
}
