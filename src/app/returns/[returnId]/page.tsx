import { Metadata } from 'next';

interface Props {
  params: { [key: string]: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `${params.slug || params.id} | page`,
  };
}

export default function pagePage({ params }: Props) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">
        {params.slug || params.id}
      </h1>
      <div>Dynamic content</div>
    </div>
  );
}
