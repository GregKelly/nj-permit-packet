import Link from 'next/link';
import { connection } from 'next/server';
import { store } from '../../lib/app';
import { Steps } from '../../ui/steps';
import { DescribeForm } from './describe';

export default async function NewJobPage() {
  await connection();
  if (!store().getProfile()) {
    return <div className="banner info">Enter your business details first: <Link href="/setup">Setup</Link>.</div>;
  }
  return (
    <>
      <h1>New job</h1>
      <Steps current="describe" />
      <DescribeForm />
    </>
  );
}
