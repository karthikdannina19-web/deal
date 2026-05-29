import { redirect } from 'next/navigation';

export default function LegalPagesRedirect() {
  redirect('/admin/cms');
}
