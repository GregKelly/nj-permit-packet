// The packet PDF. The first request builds and saves it (the job is then "printed");
// later ones return the same saved PDF until a fact changes.

import { JobError } from '../../../../src/jobs/service';
import { jobs } from '../../../lib/app';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  try {
    let pdf: Uint8Array;
    try {
      pdf = (await jobs().packet(id)).pdf;
    } catch (error) {
      // Rules changed since printing: the packet as printed is still there to see.
      const printed = error instanceof JobError ? jobs().printedPacket(id) : null;
      if (!printed) throw error;
      pdf = printed;
    }
    const street = jobs().view(id).job.site.street.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const download = new URL(request.url).searchParams.has('download');
    return new Response(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="permit-packet-${street}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (!(error instanceof JobError)) throw error;
    return new Response(error.message, { status: 409, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
