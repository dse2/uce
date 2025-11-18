
import React, { useState, useCallback, ChangeEvent, useMemo, useEffect } from 'react';
import { ProcuracaoData, HistoryItem } from '../types';
import { parseSpreadsheet } from '../services/documentService';
import { analyzeDataWithGemini, correctDataWithGemini } from '../services/geminiService';
import { generateDocx, generatePdf, generateAbntDocx, createFilename } from '../services/documentService';
import ProcuracaoForm from './ProcuracaoForm';
import ProcuracaoPreview from './ProcuracaoPreview';
import { 
    UploadCloudIcon, BrainCircuitIcon, FileTextIcon, 
    CheckCircleIcon, AlertTriangleIcon, 
    DownloadIcon, MailIcon, ClipboardEditIcon
} from './IconComponents';

type InputMode = 'upload' | 'form';

const MainApp: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedDocs, setParsedDocs] = useState<ProcuracaoData[]>([]);
  const [rawSelectedDoc, setRawSelectedDoc] = useState<ProcuracaoData | null>(null);
  const [correctedDoc, setCorrectedDoc] = useState<ProcuracaoData | null>(null);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<InputMode>('upload');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const savedHistory = localStorage.getItem('procuracaoHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch {
      return [];
    }
  });

  const selectedDoc = useMemo(() => correctedDoc || rawSelectedDoc, [correctedDoc, rawSelectedDoc]);

  const handleDocSelection = useCallback((doc: ProcuracaoData | null) => {
    setRawSelectedDoc(doc);
    setCorrectedDoc(null);
  }, []);

  const resetState = useCallback(() => {
    setFile(null);
    setFileName('');
    setParsedDocs([]);
    handleDocSelection(null);
    setError('');
    setAiAnalysis('');
  }, [handleDocSelection]);

  useEffect(() => {
    const correctData = async () => {
        if (rawSelectedDoc) {
            setIsCorrecting(true);
            setAiAnalysis(''); 
            try {
                const doc = await correctDataWithGemini(rawSelectedDoc);
                setCorrectedDoc(doc);
            } catch (error) {
                console.error("Failed to correct data with AI:", error);
                setCorrectedDoc(rawSelectedDoc); // Fallback to raw doc on error
            } finally {
                setIsCorrecting(false);
            }
        }
    };
    correctData();
  }, [rawSelectedDoc]);

  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        const fileType = selectedFile.type;
        const isXlsx = fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        if (!isXlsx) {
            setError('Formato de arquivo inválido. Por favor, envie um arquivo .xlsx.');
            return;
        }

      setIsProcessing(true);
      setError('');
      setFile(selectedFile);
      setFileName(selectedFile.name);
      try {
        const parsedDataArray = await parseSpreadsheet(selectedFile);
        setParsedDocs(parsedDataArray);
        if (parsedDataArray.length > 0) {
            handleDocSelection(parsedDataArray[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao processar o arquivo.');
        setParsedDocs([]);
        handleDocSelection(null);
      } finally {
        setIsProcessing(false);
      }
    }
  }, [resetState, handleDocSelection]);

  const handleFormDataSubmit = useCallback((formData: ProcuracaoData) => {
    resetState();
    handleDocSelection(formData);
    setFileName(`Formulário Preenchido - ${new Date().toLocaleTimeString()}`);
  }, [resetState, handleDocSelection]);


  const handleAiAnalysis = useCallback(async () => {
    if (!selectedDoc) return;
    setIsAnalyzing(true);
    setAiAnalysis('');
    try {
      const analysisResult = await analyzeDataWithGemini(selectedDoc);
      setAiAnalysis(analysisResult);
    } catch (err) {
      setAiAnalysis('Falha na análise com IA: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedDoc]);

  const addToHistory = (procuracaoData: ProcuracaoData, type: string) => {
    const newItem: HistoryItem = {
      id: new Date().toISOString(),
      timestamp: new Date().toLocaleString('pt-BR'),
      fileName: fileName || createFilename(procuracaoData, `procuracao_${type}`),
      data: procuracaoData,
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updatedHistory);
    localStorage.setItem('procuracaoHistory', JSON.stringify(updatedHistory));
  };

  const validationStatus = useMemo(() => {
    if (!selectedDoc) return { valid: false, message: "Aguardando dados para validação." };
    
    const requiredFields: { [key: string]: string } = {
        'obra': 'Obra',
        'procurador1_nome': 'Nome do Procurador 1',
        'procurador1_cpf': 'CPF do Procurador 1',
    };
    
    // Check for conta_corrente specifically, allowing 0
    const contaCorrente = selectedDoc['conta_corrente'];
    const isContaCorrenteMissing = contaCorrente === null || contaCorrente === undefined || String(contaCorrente).trim() === '';

    const missingFields = Object.keys(requiredFields).filter(field => {
        const value = selectedDoc[field];
        return value === null || value === undefined || String(value).trim() === '';
    });
    
    if (isContaCorrenteMissing) {
        missingFields.push('conta_corrente');
        requiredFields['conta_corrente'] = 'Conta Corrente';
    }


    if (missingFields.length > 0) {
        const missingFieldNames = missingFields.map(field => requiredFields[field]);
        return { valid: false, message: `Campos obrigatórios faltando: ${missingFieldNames.join(', ')}.` };
    }
    return { valid: true, message: "Dados essenciais preenchidos." };
  }, [selectedDoc]);
  
  const handleGenerateDocx = useCallback(() => {
    if (!selectedDoc) return;

    if (!validationStatus.valid) {
        const proceed = window.confirm(`Atenção: ${validationStatus.message}\n\nDeseja gerar o documento mesmo assim?`);
        if (!proceed) return;
    }

    generateDocx(selectedDoc);
    addToHistory(selectedDoc, 'docx');
  }, [selectedDoc, validationStatus, history, fileName]);

  const handleGenerateAbntDocx = useCallback(() => {
    if (!selectedDoc) return;

    if (!validationStatus.valid) {
        const proceed = window.confirm(`Atenção: ${validationStatus.message}\n\nDeseja gerar o documento mesmo assim?`);
        if (!proceed) return;
    }

    generateAbntDocx(selectedDoc);
    addToHistory(selectedDoc, 'docx_abnt');
  }, [selectedDoc, validationStatus]);

  const handleGeneratePdf = useCallback(() => {
    if (!selectedDoc) return;

    if (!validationStatus.valid) {
        const proceed = window.confirm(`Atenção: ${validationStatus.message}\n\nDeseja gerar o documento mesmo assim?`);
        if (!proceed) return;
    }

    generatePdf(selectedDoc);
    addToHistory(selectedDoc, 'pdf');
  }, [selectedDoc, validationStatus, history, fileName]);

  const handleEmail = useCallback(() => {
      if(!selectedDoc) return;
      const recipient = selectedDoc['procurador1_email'] || selectedDoc['procurador2_email'] || ''; 
      const subject = `Procuração - Obra ${selectedDoc['obra'] || 'Documento'}`;
      const body = `Prezados, \n\nSegue em anexo a procuração gerada pelo sistema. \n\nAtenciosamente.`;
      window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [selectedDoc]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <FileTextIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gerador de Procurações</h1>
        </div>
      </header>

      <main className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Input Area */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => { setInputMode('upload'); resetState(); }}
                        className={`${
                            inputMode === 'upload'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <UploadCloudIcon className="w-5 h-5" />
                        Enviar Arquivo
                    </button>
                    <button
                        onClick={() => { setInputMode('form'); resetState(); }}
                        className={`${
                            inputMode === 'form'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        <ClipboardEditIcon className="w-5 h-5" />
                        Preencher Formulário
                    </button>
                </nav>
            </div>
            
            {inputMode === 'upload' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">1. Enviar Planilha (.xlsx)</h2>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <label htmlFor="file-upload" className="mt-4 cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        Selecionar Arquivo
                    </label>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {fileName ? `Arquivo: ${fileName}` : "Nenhum arquivo selecionado."}
                    </p>
                </div>
                {isProcessing && <p className="mt-4 text-blue-500">Processando...</p>}
                {error && <p className="mt-4 text-red-500">{error}</p>}
              </div>
            )}

            {inputMode === 'form' && (
              <div>
                 <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">1. Preencher Dados da Procuração</h2>
                 <ProcuracaoForm onSubmit={handleFormDataSubmit} />
              </div>
            )}
          </div>
          
          {/* Document List */}
          {inputMode === 'upload' && parsedDocs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">
                    {parsedDocs.length} Documento(s) Encontrado(s) na Planilha
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {parsedDocs.map((doc, index) => (
                        <button
                            key={index}
                            onClick={() => handleDocSelection(doc)}
                            className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                                rawSelectedDoc === doc
                                    ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500 shadow-md'
                                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 hover:dark:bg-gray-600'
                            }`}
                        >
                            <p className="font-semibold text-gray-800 dark:text-white truncate">Obra: {doc.obra || 'Não especificada'}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Procurador 1: {doc.procurador1_nome || 'N/A'}</p>
                        </button>
                    ))}
                </div>
            </div>
           )}


          {/* Data Preview & AI Analysis */}
          {selectedDoc && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">2. Pré-visualização e Validação</h2>
                        {isCorrecting ? (
                            <div className="mt-2 flex items-center space-x-2 text-sm text-blue-500 animate-pulse">
                                <BrainCircuitIcon className="w-5 h-5"/>
                                <span>Verificando e corrigindo dados com IA...</span>
                            </div>
                        ) : (
                            <div className={`mt-2 flex items-center space-x-2 text-sm ${validationStatus.valid ? 'text-green-600' : 'text-yellow-600'}`}>
                                {validationStatus.valid ? <CheckCircleIcon className="w-5 h-5"/> : <AlertTriangleIcon className="w-5 h-5"/>}
                                <span>{validationStatus.message}</span>
                            </div>
                        )}
                    </div>
                    <button onClick={handleAiAnalysis} disabled={isAnalyzing || isCorrecting} className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <BrainCircuitIcon className="w-5 h-5" />
                        <span>{isAnalyzing ? "Analisando..." : "Análise com IA"}</span>
                    </button>
                </div>
              <div className="max-h-60 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border dark:border-gray-600">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  {Object.entries(selectedDoc).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{key}</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              {aiAnalysis && (
                <div className="mt-4 p-4 bg-purple-50 dark:bg-gray-700 rounded-lg border border-purple-200 dark:border-purple-600">
                    <h3 className="text-md font-semibold text-purple-800 dark:text-purple-200 mb-2">Resultado da Análise IA:</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{aiAnalysis}</p>
                </div>
              )}
            </div>
          )}

          {/* Text Preview */}
          {selectedDoc && !isCorrecting && <ProcuracaoPreview data={selectedDoc} />}

           {/* Actions */}
          {selectedDoc && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">3. Gerar Documentos</h2>
                
                {!validationStatus.valid && (
                    <div className="p-4 bg-yellow-50 dark:bg-gray-700 rounded-lg border border-yellow-300 dark:border-yellow-600 flex items-start space-x-3">
                        <AlertTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-md font-semibold text-yellow-800 dark:text-yellow-200">Aviso de Dados Incompletos</h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">{validationStatus.message}</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">É possível gerar o documento, mas ele pode ficar incompleto.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-4">
                    <button onClick={handleGenerateAbntDocx} className="flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition">
                       <DownloadIcon className="w-5 h-5"/> <span>Baixar .DOCX (ABNT)</span>
                    </button>
                    <button onClick={handleGenerateDocx} className="flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-4 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700 transition">
                       <DownloadIcon className="w-5 h-5"/> <span>Gerar .DOCX</span>
                    </button>
                     <button onClick={handleGeneratePdf} className="flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-4 py-3 font-semibold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 transition">
                       <DownloadIcon className="w-5 h-5"/> <span>Gerar .PDF</span>
                    </button>
                    <button onClick={handleEmail} className="flex-1 min-w-[150px] flex items-center justify-center space-x-2 px-4 py-3 font-semibold text-white bg-sky-500 rounded-lg shadow-md hover:bg-sky-600 transition">
                       <MailIcon className="w-5 h-5"/> <span>Enviar por E-mail</span>
                    </button>
                </div>
            </div>
          )}

        </div>

        {/* History */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Histórico de Gerações</h2>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                  <p className="font-semibold text-gray-800 dark:text-white truncate">{item.fileName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.timestamp}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum documento gerado ainda.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainApp;
