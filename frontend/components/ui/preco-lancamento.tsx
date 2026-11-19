/**
 * Preço de lançamento convertido para reais ("≈ R$ 4.960") com o valor original
 * ao lado ("800 EUR"), para ficar claro que é uma conversão e não preço de loja.
 */
export function PrecoLancamento({ estimado, original }: { estimado: string | null; original: string | null }) {
  if (!estimado) return <>{original}</>;
  return (
    <span className="preco-lancamento">
      <span>≈ {estimado}</span>
      {original && (
        <span className="preco-lancamento__original" title="Preço de lançamento informado pela MobileAPI">
          {original}
        </span>
      )}
    </span>
  );
}
