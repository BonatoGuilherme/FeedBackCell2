import PhoneDetail from "../../components/PhoneDetail";

export default async function CelularPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // só ids inteiros positivos; o resto cai direto em "celular não encontrado"
  const idcelular = /^[1-9]\d{0,9}$/.test(id) ? Number(id) : null;
  return <PhoneDetail key={id} idcelular={idcelular} />;
}
