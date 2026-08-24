import { useState } from 'react'
import toast from 'react-hot-toast'
// O pacote não expõe export raiz, só subcaminhos condicionais; /browser é o
// build que roda no navegador (o /node escreve em filesystem).
import writeXlsxFile from 'write-excel-file/browser'
import { buildSheets, exportFileName, fetchEventSnapshot } from './eventExport'

// Baixa o pacote de contingência como um .xlsx com abas.
//
// Tudo acontece no navegador: a planilha é montada a partir do que a sessão do
// operador já pode ler por RLS. Não há endpoint novo, nada é gravado no
// servidor, e nenhuma chave privilegiada entra na jogada.
export function useEventExport() {
  const [loading, setLoading] = useState(false)

  async function exportEvent() {
    setLoading(true)
    const toastId = toast.loading('Montando a planilha…')
    try {
      const snapshot = await fetchEventSnapshot()
      const sheets = buildSheets(snapshot)

      // Três detalhes de API que a v4 trouxe, todos fáceis de errar copiando
      // exemplo antigo:
      //  - múltiplas abas viram um array de { data, sheet } (a forma
      //    `dados + { sheets: [...] }` saiu na v3);
      //  - a chave do nome da aba é `sheet`, NÃO `name`. E o TypeScript não
      //    protege: SheetOptions tem todos os campos opcionais, então `name`
      //    passa batido e o arquivo sai com "Sheet1".."Sheet6" em silêncio.
      //    Só o teste que abre o .xlsx gerado pega isso;
      //  - `fileName` deixou de ser opção — a chamada devolve
      //    { toBlob, toFile } e o download é o toFile.
      await writeXlsxFile(
        sheets.map((s) => ({ sheet: s.name, data: s.rows })),
      ).toFile(exportFileName())

      toast.success('Planilha baixada', { id: toastId })
    } catch (err) {
      toast.error(
        err instanceof Error ? `Falha ao exportar: ${err.message}` : 'Falha ao exportar',
        { id: toastId },
      )
    } finally {
      setLoading(false)
    }
  }

  return { exportEvent, loading }
}
