import { ProcuracaoData } from '../types';

// These are globals loaded from CDNs in index.html
declare const XLSX: any;
declare const docx: any;
declare const jspdf: any;

/**
 * Safely retrieves data from the data object, providing a consistent fallback.
 * @param data The source data object.
 * @param key The key to retrieve.
 * @param fallback The fallback string if the key is not found or value is null/undefined.
 * @returns The value as a string.
 */
const getData = (data: ProcuracaoData, key: string, fallback: string = '[NÃO INFORMADO]'): string => {
    const value = data[key];
    return value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : fallback;
};


export const parseSpreadsheet = (file: File): Promise<ProcuracaoData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 1 });
        
        const documents: ProcuracaoData[] = rows.map((row): ProcuracaoData | null => {
          if (row.length === 0 || row.every(cell => cell === null || cell === '')) return null;

          const getString = (col: number) => row[col] ? String(row[col]).trim() : '';
          
          const getDateString = (col: number) => {
              const cell = row[col];
              if (cell instanceof Date) {
                  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                  const correctedDate = new Date(cell.getTime() - tzoffset);
                  return correctedDate.toISOString().split('T')[0];
              }
              return cell ? String(cell).trim() : '';
          }

          const procurador1_endereco = [
              getString(14), getString(16), getString(18), getString(20)
          ].filter(Boolean).join(', ');

          const procurador2_endereco = [
              getString(15), getString(17), getString(19), getString(21)
          ].filter(Boolean).join(', ');

          return {
            carimbo_data_hora: getDateString(0),
            solicitante: getString(1),
            data_solicitacao: getDateString(2),
            obra: getString(3),
            procurador1_nome: getString(4),
            procurador2_nome: getString(5),
            procurador1_email: getString(6),
            procurador2_email: getString(7),
            procurador1_nacionalidade: getString(8),
            procurador2_nacionalidade: getString(9),
            procurador1_profissao: getString(10),
            procurador2_profissao: getString(11),
            procurador1_estado_civil: getString(12),
            procurador2_estado_civil: getString(13),
            procurador1_endereco: procurador1_endereco,
            procurador2_endereco: procurador2_endereco,
            procurador1_rg: getString(22),
            procurador2_rg: getString(23),
            procurador1_cpf: getString(24),
            procurador2_cpf: getString(25),
            data_ultima_procuracao: getDateString(26),
            conta_corrente: getString(27),
          };
        }).filter((doc): doc is ProcuracaoData => doc !== null);
        
        if (documents.length === 0) {
          reject(new Error("A planilha parece estar vazia ou não contém dados nas linhas após o cabeçalho."));
          return;
        }

        resolve(documents);
      } catch (error) {
        console.error("Parsing error:", error);
        reject(new Error("Falha ao ler o arquivo. Verifique se o formato está correto e corresponde ao modelo esperado."));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

export const createFilename = (data: ProcuracaoData, prefix: string) => {
    const obra = getData(data, 'obra', 'Obra').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${prefix}_${obra}_${date}`;
};

const getProcuradoresRuns = (data: ProcuracaoData): any[] => {
    const { TextRun } = docx;
    const procuradores = [
        { nome: getData(data, 'procurador1_nome', ''), index: 1 },
        { nome: getData(data, 'procurador2_nome', ''), index: 2 }
    ].filter(p => p.nome && p.nome !== '[NÃO INFORMADO]');

    if (procuradores.length === 0) {
        return [new TextRun({ text: "[PROCURADORES NÃO INFORMADOS]", bold: true })];
    }
    
    const parts: any[] = [];
    procuradores.forEach((p, index) => {
        if (index > 0) {
            parts.push(new TextRun({ text: '; ' }));
        }
        
        const details = `, ${getData(data, `procurador${p.index}_nacionalidade`)}, maior, ${getData(data, `procurador${p.index}_estado_civil`)}, ${getData(data, `procurador${p.index}_profissao`)}, CPF nº ${getData(data, `procurador${p.index}_cpf`)} e carteira de identidade nº ${getData(data, `procurador${p.index}_rg`)}, residente e domiciliado a ${getData(data, `procurador${p.index}_endereco`)}`;

        parts.push(new TextRun({ text: p.nome.toUpperCase(), bold: true }));
        parts.push(new TextRun({ text: details }));
    });
    return parts;
};

const getProcuradoresText = (data: ProcuracaoData): string => {
    const procuradores = [
        { nome: getData(data, 'procurador1_nome', ''), index: 1 },
        { nome: getData(data, 'procurador2_nome', ''), index: 2 }
    ].filter(p => p.nome && p.nome !== '[NÃO INFORMADO]');

    if (procuradores.length === 0) {
        return "[PROCURADORES NÃO INFORMADOS]";
    }
    
    return procuradores.map(p => 
        `${p.nome.toUpperCase()}, ${getData(data, `procurador${p.index}_nacionalidade`)}, maior, ${getData(data, `procurador${p.index}_estado_civil`)}, ${getData(data, `procurador${p.index}_profissao`)}, CPF nº ${getData(data, `procurador${p.index}_cpf`)} e carteira de identidade nº ${getData(data, `procurador${p.index}_rg`)}, residente e domiciliado a ${getData(data, `procurador${p.index}_endereco`)}`
    ).join('; ');
}

const createMainParagraphRuns = (data: ProcuracaoData, formattedDate: string) => {
    const { TextRun } = docx;

    return [
        new TextRun({ text: `Pelo presente instrumento particular de procuração, firmado em ${formattedDate}, subscreve este documento a outorgante ` }),
        new TextRun({ text: "LCM CONSTRUÇÃO E COMERCIO S/A", bold: true }),
        new TextRun({ text: `, CNPJ 19.758.842/0001-35, com sede nesta capital, na Rua Polos , nº 150 – sala 201, representada por seu diretor ` }),
        new TextRun({ text: "LUIZ OTÁVIO FONTES JUNQUEIRA", bold: true }),
        new TextRun({ text: `, brasileiro, separado judicialmente, engenheiro civil, CPF 303.269.316-00, CI M-738.694 (SSP/MG), residente em Nova Lima/MG, à rua cinco, 445, Condomínio Riviera; parte(s) que se identificou(ram) ser(em) a(s) própria(s), conforme documentação apresentada do que dou fé. E, pelo(a-s) outorgante(s) me foi dito que nomeia(m) e constitui(em) seu(a-s) bastante(s) procurador(a-es): ` }),
        ...getProcuradoresRuns(data),
        new TextRun({ text: `, a quem confere poderes especiais para representar a outorgante perante a ${getData(data, 'instituicao_financeira', 'CAIXA ECONÔMICA FEDERAL')}, Agência: ${getData(data, 'agencia')} - Operação: ${getData(data, 'operacao')} - Conta ${getData(data, 'conta_corrente')}, podendo ` }),
        new TextRun({ text: "SEMPRE EM CONJUNTO", bold: true, allCaps: true }),
        new TextRun({ text: ` abrir , fechar, movimentá-la, emitir e endossar cheques, desde que tenham o necessário saldo, fazer retiradas mediante recibos, autorizar débitos e pagamentos por qualquer meio , inclusive eletrônico, requisitar talões de cheques, fazer movimentações eletrônicas , cadastrar , alterar , desbloquear e utilizar senhas eletrônicas no internet banking e, enfim, praticar todos os demais atos necessários ao bom, fiel e completo desempenho deste mandato, ` }),
        new TextRun({ text: "NÃO PODENDO SUBSTABELECER", bold: true, allCaps: true }),
        new TextRun({ text: `. O qual terá prazo de validade de 01 (um) ano, a contar da presente data.` }),
    ];
}

const createDocumentContent = (data: ProcuracaoData) => {
    const { TextRun, Paragraph, AlignmentType } = docx;

    const dataSolicitacaoRaw = getData(data, 'data_solicitacao', new Date().toISOString().split('T')[0]);
    const [year, month, day] = dataSolicitacaoRaw.split('T')[0].split('-').map(Number);
    const dataSolicitacao = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = dataSolicitacao.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    return [
        new Paragraph({
             alignment: AlignmentType.CENTER,
             children: [new TextRun({ text: "PROCURAÇÃO", size: 24, bold: true })],
             spacing: { after: 400 },
        }),
        new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 },
            children: createMainParagraphRuns(data, formattedDate),
            spacing: { after: 600 },
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [ new TextRun({ text: `${getData(data, 'cidade_emissao', 'Belo Horizonte')}, ${formattedDate}.` }) ],
        }),
    ];
}

export const generateDocx = (data: ProcuracaoData) => {
    if (typeof docx === 'undefined' || typeof docx.Packer === 'undefined') {
        alert("A biblioteca de geração de DOCX não foi carregada. Por favor, recarregue a página e tente novamente.");
        return;
    }
    const { Document, Packer } = docx;

    try {
        const doc = new Document({
          sections: [{
              properties: {
                 page: {
                    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // ~1 inch
                 },
              },
              children: createDocumentContent(data),
          }],
        });
      
        Packer.toBlob(doc).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${createFilename(data, 'procuracao')}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }).catch(err => {
            console.error("Erro ao gerar DOCX:", err);
            alert("Ocorreu um erro inesperado ao gerar o arquivo .docx. Verifique o console do navegador para mais detalhes.");
        });
    } catch (e) {
        console.error("Erro ao gerar DOCX:", e);
        alert("Ocorreu um erro inesperado ao gerar o arquivo .docx. Verifique os dados e tente novamente.");
    }
};

const createAbntDocumentContent = (data: ProcuracaoData) => {
    const { TextRun, Paragraph, AlignmentType } = docx;

    const dataSolicitacaoRaw = getData(data, 'data_solicitacao', new Date().toISOString().split('T')[0]);
    const [year, month, day] = dataSolicitacaoRaw.split('T')[0].split('-').map(Number);
    const dataSolicitacao = new Date(Date.UTC(year, month - 1, day));
    const formattedDate = dataSolicitacao.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

    const p1Nome = getData(data, 'procurador1_nome');
    const p2Nome = getData(data, 'procurador2_nome');

    const signatureLine = "________________________________________";

    return [
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "PROCURAÇÃO", bold: true, allCaps: true, size: 28 })],
            spacing: { after: 800 },
        }),
        new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: 720 }, // ~1.25 cm
            spacing: { line: 360 }, // 1.5 lines
            children: createMainParagraphRuns(data, formattedDate),
        }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [ new TextRun({ text: `${getData(data, 'cidade_emissao', 'Belo Horizonte')}, ${formattedDate}.` }) ],
            spacing: { after: 800 },
        }),
        
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [ new TextRun({ text: signatureLine }) ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [ new TextRun({ text: "LCM CONSTRUÇÃO E COMÉRCIO S/A", bold: true }) ],
        }),
         new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [ new TextRun({ text: "p.p. LUIZ OTÁVIO FONTES JUNQUEIRA" }) ],
            spacing: { after: 400 },
        }),

        ...(p1Nome !== '[NÃO INFORMADO]' ? [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: signatureLine }) ] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: p1Nome.toUpperCase(), bold: true }) ], spacing: { after: 400 } }),
        ] : []),

        ...(p2Nome !== '[NÃO INFORMADO]' ? [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: signatureLine }) ] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [ new TextRun({ text: p2Nome.toUpperCase(), bold: true }) ], spacing: { after: 400 } }),
        ] : []),
    ];
}

export const generateAbntDocx = (data: ProcuracaoData) => {
    if (typeof docx === 'undefined' || typeof docx.Packer === 'undefined') {
        alert("A biblioteca de geração de DOCX não foi carregada. Por favor, recarregue a página e tente novamente.");
        return;
    }
    const { Document, Packer } = docx;

    try {
        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: "Times New Roman",
                            size: 24, // 12pt
                        },
                    },
                },
            },
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 1701,    // 3cm
                            right: 1134,  // 2cm
                            bottom: 1134, // 2cm
                            left: 1701,   // 3cm
                        },
                    },
                },
                children: createAbntDocumentContent(data),
            }],
        });
      
        Packer.toBlob(doc).then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${createFilename(data, 'procuracao_ABNT')}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }).catch(err => {
            console.error("Erro ao gerar DOCX (ABNT):", err);
            alert("Ocorreu um erro inesperado ao gerar o arquivo .docx (ABNT). Verifique o console do navegador para mais detalhes.");
        });
    } catch (e) {
        console.error("Erro ao gerar DOCX (ABNT):", e);
        alert("Ocorreu um erro inesperado ao gerar o arquivo .docx formatado. Verifique os dados e tente novamente.");
    }
};

export const generatePdf = (data: ProcuracaoData) => {
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        alert("A biblioteca de geração de PDF (jsPDF) não foi carregada. Por favor, recarregue a página e tente novamente.");
        return;
    }
    const { jsPDF } = jspdf;

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const margin = 20;
        const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
        let y = 30;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("PROCURAÇÃO", doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 15;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);

        const dataSolicitacaoRaw = getData(data, 'data_solicitacao', new Date().toISOString().split('T')[0]);
        const [year, month, day] = dataSolicitacaoRaw.split('T')[0].split('-').map(Number);
        const dataSolicitacao = new Date(Date.UTC(year, month - 1, day));
        const formattedDate = dataSolicitacao.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        
        const procuradoresText = getProcuradoresText(data);

        const fullText = `Pelo presente instrumento particular de procuração, firmado em ${formattedDate}, subscreve este documento a outorgante LCM CONSTRUÇÃO E COMERCIO S/A, CNPJ 19.758.842/0001-35, com sede nesta capital, na Rua Polos , nº 150 – sala 201, representada por seu diretor LUIZ OTÁVIO FONTES JUNQUEIRA, brasileiro, separado judicialmente, engenheiro civil, CPF 303.269.316-00, CI M-738.694 (SSP/MG), residente em Nova Lima/MG, à rua cinco, 445, Condomínio Riviera; parte(s) que se identificou(ram) ser(em) a(s) própria(s), conforme documentação apresentada do que dou fé. E, pelo(a-s) outorgante(s) me foi dito que nomeia(m) e constitui(em) seu(a-s) bastante(s) procurador(a-es): ${procuradoresText}, a quem confere poderes especiais para representar a outorgante perante a ${getData(data, 'instituicao_financeira', 'CAIXA ECONÔMICA FEDERAL')}, Agência: ${getData(data, 'agencia')} - Operação: ${getData(data, 'operacao')} - Conta ${getData(data, 'conta_corrente')}, podendo SEMPRE EM CONJUNTO abrir , fechar, movimentá-la, emitir e endossar cheques, desde que tenham o necessário saldo, fazer retiradas mediante recibos, autorizar débitos e pagamentos por qualquer meio , inclusive eletrônico, requisitar talões de cheques, fazer movimentações eletrônicas , cadastrar , alterar , desbloquear e utilizar senhas eletrônicas no internet banking e, enfim, praticar todos os demais atos necessários ao bom, fiel e completo desempenho deste mandato, NÃO PODENDO SUBSTABELECER. O qual terá prazo de validade de 01 (um) ano, a contar da presente data.`;

        const lines = doc.splitTextToSize(fullText, maxWidth);
        doc.text(lines, margin, y, { align: 'justify' });
        
        y += (lines.length * 4) + 15;

        doc.text(`${getData(data, 'cidade_emissao', 'Belo Horizonte')}, ${formattedDate}.`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });

        doc.save(`${createFilename(data, 'procuracao')}.pdf`);
    } catch(e) {
        console.error("Erro ao gerar PDF:", e);
        alert("Ocorreu um erro inesperado ao gerar o arquivo .pdf. Verifique os dados e tente novamente.");
    }
};
