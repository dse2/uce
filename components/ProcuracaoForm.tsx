import React, { useState } from 'react';
import { ProcuracaoData } from '../types';

interface ProcuracaoFormProps {
  onSubmit: (data: ProcuracaoData) => void;
}

const ProcuracaoForm: React.FC<ProcuracaoFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<Partial<ProcuracaoData>>({
    data_solicitacao: new Date().toISOString().split('T')[0],
    instituicao_financeira: 'Caixa Econômica Federal',
    cidade_emissao: 'Belo Horizonte',
    procurador1_nacionalidade: 'brasileiro',
    procurador2_nacionalidade: 'brasileiro',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as ProcuracaoData);
  };

  const InputField = ({ name, label, required = false, value, ...props }: any) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type="text"
            id={name}
            name={name}
            required={required}
            value={value || ''}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            {...props}
        />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Dados Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="data_solicitacao" label="Data da Solicitação" type="date" required value={formData.data_solicitacao}/>
                <InputField name="obra" label="Obra" required value={formData.obra} />
                <InputField name="instituicao_financeira" label="Instituição Financeira" required value={formData.instituicao_financeira}/>
                <InputField name="agencia" label="Agência" required value={formData.agencia} />
                <InputField name="operacao" label="Operação" required value={formData.operacao} />
                <InputField name="conta_corrente" label="Conta Corrente" required value={formData.conta_corrente} />
                <InputField name="cidade_emissao" label="Cidade de Emissão" required value={formData.cidade_emissao}/>
            </div>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Procurador 1</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="procurador1_nome" label="Nome Completo" required value={formData.procurador1_nome} />
                <InputField name="procurador1_nacionalidade" label="Nacionalidade" required value={formData.procurador1_nacionalidade}/>
                <InputField name="procurador1_profissao" label="Profissão" required value={formData.procurador1_profissao} />
                <InputField name="procurador1_estado_civil" label="Estado Civil" required value={formData.procurador1_estado_civil} />
                <InputField name="procurador1_rg" label="RG (com órgão emissor)" required value={formData.procurador1_rg} />
                <InputField name="procurador1_cpf" label="CPF" required value={formData.procurador1_cpf} />
                <InputField name="procurador1_endereco" label="Endereço Completo" required className="md:col-span-2" value={formData.procurador1_endereco} />
            </div>
        </div>
        
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Procurador 2</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="procurador2_nome" label="Nome Completo" value={formData.procurador2_nome} />
                <InputField name="procurador2_nacionalidade" label="Nacionalidade" value={formData.procurador2_nacionalidade}/>
                <InputField name="procurador2_profissao" label="Profissão" value={formData.procurador2_profissao} />
                <InputField name="procurador2_estado_civil" label="Estado Civil" value={formData.procurador2_estado_civil} />
                <InputField name="procurador2_rg" label="RG (com órgão emissor)" value={formData.procurador2_rg} />
                <InputField name="procurador2_cpf" label="CPF" value={formData.procurador2_cpf} />
                <InputField name="procurador2_endereco" label="Endereço Completo" className="md:col-span-2" value={formData.procurador2_endereco} />
            </div>
        </div>
      
      <button
        type="submit"
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Pré-visualizar e Validar Dados
      </button>
    </form>
  );
};

export default ProcuracaoForm;