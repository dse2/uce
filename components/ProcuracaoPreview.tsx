import React from 'react';
import { ProcuracaoData } from '../types';

const getData = (data: ProcuracaoData | null, key: string, fallback: string = '[NÃO INFORMADO]'): string => {
    if (!data) return fallback;
    const value = data[key];
    return value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : fallback;
};

const getProcuradoresTextForPreview = (data: ProcuracaoData | null): string => {
    if (!data) return '[PROCURADORES NÃO INFORMADOS]';
    const procuradores = [
        { nome: getData(data, 'procurador1_nome'), index: 1 },
        { nome: getData(data, 'procurador2_nome'), index: 2 }
    ].filter(p => p.nome && p.nome !== '[NÃO INFORMADO]');

    if (procuradores.length === 0) {
        return '[PROCURADORES NÃO INFORMADOS]';
    }

    return procuradores.map(p => 
        `${String(p.nome).toUpperCase()}, ${getData(data, `procurador${p.index}_nacionalidade`)}, maior, ${getData(data, `procurador${p.index}_estado_civil`)}, ${getData(data, `procurador${p.index}_profissao`)}, CPF nº ${getData(data, `procurador${p.index}_cpf`)} e carteira de identidade nº ${getData(data, `procurador${p.index}_rg`)}, residente e domiciliado a ${getData(data, `procurador${p.index}_endereco`)}`
    ).join('; ');
};

interface ProcuracaoPreviewProps {
  data: ProcuracaoData | null;
}

const ProcuracaoPreview: React.FC<ProcuracaoPreviewProps> = ({ data }) => {
  if (!data) {
    return null;
  }

  const dataSolicitacaoRaw = getData(data, 'data_solicitacao', new Date().toISOString().split('T')[0]);
  const [year, month, day] = dataSolicitacaoRaw.split('T')[0].split('-').map(Number);
  const dataSolicitacao = new Date(Date.UTC(year, month - 1, day));
  const formattedDate = dataSolicitacao.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  
  const procuradoresText = getProcuradoresTextForPreview(data);

  const fullText = `Pelo presente instrumento particular de procuração, firmado em ${formattedDate}, subscreve este documento a outorgante LCM CONSTRUÇÃO E COMERCIO S/A, CNPJ 19.758.842/0001-35, com sede nesta capital, na Rua Polos , nº 150 – sala 201, representada por seu diretor LUIZ OTÁVIO FONTES JUNQUEIRA, brasileiro, separado judicialmente, engenheiro civil, CPF 303.269.316-00, CI M-738.694 (SSP/MG), residente em Nova Lima/MG, à rua cinco, 445, Condomínio Riviera; parte(s) que se identificou(ram) ser(em) a(s) própria(s), conforme documentação apresentada do que dou fé. E, pelo(a-s) outorgante(s) me foi dito que nomeia(m) e constitui(em) seu(a-s) bastante(s) procurador(a-es): ${procuradoresText}, a quem confere poderes especiais para representar a outorgante perante a ${getData(data, 'instituicao_financeira', 'CAIXA ECONÔMICA FEDERAL')}, Agência: ${getData(data, 'agencia')} - Operação: ${getData(data, 'operacao')} - Conta ${getData(data, 'conta_corrente')}, podendo SEMPRE EM CONJUNTO abrir , fechar, movimentá-la, emitir e endossar cheques, desde que tenham o necessário saldo, fazer retiradas mediante recibos, autorizar débitos e pagamentos por qualquer meio , inclusive eletrônico, requisitar talões de cheques, fazer movimentações eletrônicas , cadastrar , alterar , desbloquear e utilizar senhas eletrônicas no internet banking e, enfim, praticar todos os demais atos necessários ao bom, fiel e completo desempenho deste mandato, NÃO PODENDO SUBSTABELECER. O qual terá prazo de validade de 01 (um) ano, a contar da presente data.`;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Preview do Texto da Procuração</h2>
      <div className="max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {fullText}
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-4 text-center">
            {`${getData(data, 'cidade_emissao', 'Belo Horizonte')}, ${formattedDate}.`}
        </p>
      </div>
    </div>
  );
};

export default ProcuracaoPreview;
