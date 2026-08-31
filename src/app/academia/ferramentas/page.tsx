'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  Wrench,
  Calculator,
  Sparkles,
  CheckSquare,
  ArrowLeft,
  Copy,
  Check,
  RotateCcw,
  Bot,
  HelpCircle,
  Flame,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  ACADEMIA_CALCULATORS,
  ACADEMIA_GENERATORS,
  ACADEMIA_CHECKLISTS,
  CalculatorDefinition,
  GeneratorDefinition,
  ChecklistDefinition,
} from '@/lib/academia/tools';

export default function FerramentasPage() {
  const [activeTab, setActiveTab] = useState<'CALCULADORAS' | 'GERADORES' | 'CHECKLISTS'>('CALCULADORAS');

  // Selected items inside each tab
  const [selectedCalcId, setSelectedCalcId] = useState<string>(ACADEMIA_CALCULATORS[0].id);
  const [calcInputs, setCalcInputs] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ACADEMIA_CALCULATORS[0].inputs.forEach((inp) => {
      initial[inp.id] = inp.defaultValue;
    });
    return initial;
  });

  const [selectedGenId, setSelectedGenId] = useState<string>(ACADEMIA_GENERATORS[0].id);
  const [genInputs, setGenInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    ACADEMIA_GENERATORS[0].inputs.forEach((inp) => {
      initial[inp.id] = inp.defaultValue || inp.options?.[0] || '';
    });
    return initial;
  });
  const [generatedOutput, setGeneratedOutput] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [selectedChecklistId, setSelectedChecklistId] = useState<string>(ACADEMIA_CHECKLISTS[0].id);
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>({});

  // Calculator switch handler
  const handleSelectCalc = (calc: CalculatorDefinition) => {
    setSelectedCalcId(calc.id);
    const newInputs: Record<string, number> = {};
    calc.inputs.forEach((inp) => {
      newInputs[inp.id] = inp.defaultValue;
    });
    setCalcInputs(newInputs);
  };

  // Generator switch handler
  const handleSelectGen = (gen: GeneratorDefinition) => {
    setSelectedGenId(gen.id);
    const newInputs: Record<string, string> = {};
    gen.inputs.forEach((inp) => {
      newInputs[inp.id] = inp.defaultValue || inp.options?.[0] || '';
    });
    setGenInputs(newInputs);
    setGeneratedOutput(null);
  };

  const currentCalc = ACADEMIA_CALCULATORS.find((c) => c.id === selectedCalcId) || ACADEMIA_CALCULATORS[0];
  const currentCalcResult = currentCalc.calculate(calcInputs);

  const currentGen = ACADEMIA_GENERATORS.find((g) => g.id === selectedGenId) || ACADEMIA_GENERATORS[0];

  const handleGenerate = () => {
    const out = currentGen.generate(genInputs);
    setGeneratedOutput(out);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentChecklist = ACADEMIA_CHECKLISTS.find((c) => c.id === selectedChecklistId) || ACADEMIA_CHECKLISTS[0];

  const toggleTask = (taskId: string) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const resetCurrentChecklist = () => {
    const cleared = { ...checkedTasks };
    currentChecklist.items.forEach((item) => {
      delete cleared[item.id];
    });
    setCheckedTasks(cleared);
  };

  const completedChecklistCount = currentChecklist.items.filter((i) => checkedTasks[i.id]).length;
  const checklistPercent = Math.round((completedChecklistCount / currentChecklist.items.length) * 100);

  return (
    <AppShell
      title="🛠️ Ferramentas & Calculadoras da Barbearia"
      subtitle="12 Calculadoras Financeiras, 8 Geradores Estratégicos e 9 Checklists Operacionais"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/academia"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar à Academia</span>
          </Link>
          <Link
            href="/academia/ia"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Consultor IA</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Main Tab Navigation */}
        <div className="flex items-center gap-2 bg-[#12151B] p-1.5 rounded-2xl border border-zinc-800 max-w-xl">
          <button
            onClick={() => setActiveTab('CALCULADORAS')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CALCULADORAS'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>12 Calculadoras</span>
          </button>
          <button
            onClick={() => setActiveTab('GERADORES')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'GERADORES'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>8 Geradores IA</span>
          </button>
          <button
            onClick={() => setActiveTab('CHECKLISTS')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'CHECKLISTS'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>9 Checklists</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. CALCULADORAS */}
        {/* ========================================================================= */}
        {activeTab === 'CALCULADORAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar list of calculators */}
            <div className="lg:col-span-4 space-y-1.5 bg-[#12151B] p-3 rounded-2xl border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 block">
                Selecione a Calculadora
              </span>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {ACADEMIA_CALCULATORS.map((calc) => {
                  const isSelected = calc.id === selectedCalcId;
                  return (
                    <button
                      key={calc.id}
                      onClick={() => handleSelectCalc(calc)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                      }`}
                    >
                      <Calculator className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <div className="overflow-hidden">
                        <span className="block truncate font-bold">{calc.name}</span>
                        <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{calc.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Calculator Canvas */}
            <div className="lg:col-span-8 space-y-5">
              <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-6 shadow-xl">
                <div className="border-b border-zinc-800 pb-4 mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{currentCalc.name}</h3>
                  <p className="text-xs text-zinc-400">{currentCalc.description}</p>
                </div>

                {/* Form Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {currentCalc.inputs.map((inp) => (
                    <div key={inp.id} className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        {inp.label}
                      </label>
                      <div className="relative">
                        {inp.type === 'currency' && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                            R$
                          </span>
                        )}
                        <input
                          type="number"
                          step={inp.type === 'currency' || inp.type === 'percent' ? 'any' : '1'}
                          value={calcInputs[inp.id] ?? inp.defaultValue}
                          onChange={(e) =>
                            setCalcInputs({
                              ...calcInputs,
                              [inp.id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className={`w-full bg-[#181B22] border border-zinc-700/60 rounded-xl py-2.5 pr-3 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500 ${
                            inp.type === 'currency' ? 'pl-9' : 'pl-3'
                          }`}
                        />
                        {inp.type === 'percent' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-bold">
                            %
                          </span>
                        )}
                      </div>
                      {inp.helpText && (
                        <span className="text-[10px] text-zinc-500 block leading-tight">{inp.helpText}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Results Card */}
                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 p-5 shadow-lg space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-amber-400 block mb-1">
                        {currentCalcResult.primaryResult.label}
                      </span>
                      <span className="text-2xl sm:text-3xl font-extrabold text-white">
                        {currentCalcResult.primaryResult.value}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metrics */}
                  {currentCalcResult.secondaryMetrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      {currentCalcResult.secondaryMetrics.map((met, idx) => (
                        <div key={idx} className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80">
                          <span className="text-[10px] text-zinc-400 block font-medium mb-0.5 truncate">{met.label}</span>
                          <span className="text-xs sm:text-sm font-bold text-zinc-200">{met.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Diagnostic Text */}
                  <div className="rounded-xl bg-zinc-950/80 p-3.5 border border-zinc-800 text-xs text-zinc-300 leading-relaxed">
                    <strong className="text-amber-400 block mb-1 font-semibold">💡 Diagnóstico do Especialista:</strong>
                    {currentCalcResult.analysis}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. GERADORES DE CONTEÚDO COM IA */}
        {/* ========================================================================= */}
        {activeTab === 'GERADORES' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar list of generators */}
            <div className="lg:col-span-4 space-y-1.5 bg-[#12151B] p-3 rounded-2xl border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 block">
                Selecione o Gerador
              </span>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {ACADEMIA_GENERATORS.map((gen) => {
                  const isSelected = gen.id === selectedGenId;
                  return (
                    <button
                      key={gen.id}
                      onClick={() => handleSelectGen(gen)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                      }`}
                    >
                      <Sparkles className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <div className="overflow-hidden">
                        <span className="block truncate font-bold">{gen.name}</span>
                        <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{gen.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Generator Canvas */}
            <div className="lg:col-span-8 space-y-5">
              <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-6 shadow-xl space-y-5">
                <div className="border-b border-zinc-800 pb-4">
                  <h3 className="text-lg font-bold text-white mb-1">{currentGen.name}</h3>
                  <p className="text-xs text-zinc-400">{currentGen.description}</p>
                </div>

                {/* Generator Form */}
                <div className="space-y-4">
                  {currentGen.inputs.map((inp) => (
                    <div key={inp.id} className="space-y-1.5">
                      <label className="block text-xs font-medium text-zinc-300">
                        {inp.label}
                      </label>
                      {inp.type === 'select' && inp.options ? (
                        <select
                          value={genInputs[inp.id] ?? inp.defaultValue}
                          onChange={(e) => setGenInputs({ ...genInputs, [inp.id]: e.target.value })}
                          className="w-full bg-[#181B22] border border-zinc-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {inp.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={inp.placeholder}
                          value={genInputs[inp.id] ?? inp.defaultValue}
                          onChange={(e) => setGenInputs({ ...genInputs, [inp.id]: e.target.value })}
                          className="w-full bg-[#181B22] border border-zinc-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleGenerate}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar Conteúdo Agora</span>
                  </button>
                </div>

                {/* Generated Output */}
                {generatedOutput && (
                  <div className="rounded-xl bg-[#181B22] border border-amber-500/30 p-5 space-y-4 mt-6">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h4 className="text-sm font-bold text-white">{generatedOutput.title}</h4>
                      <button
                        onClick={() => handleCopyText(generatedOutput.content)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors border border-zinc-700"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                      </button>
                    </div>

                    <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-zinc-300 whitespace-pre-line leading-relaxed">
                      {generatedOutput.content}
                    </div>

                    {generatedOutput.tips?.length > 0 && (
                      <div className="rounded-lg bg-zinc-900 p-3 border border-zinc-800 text-[11px] text-amber-300/90 space-y-1">
                        <strong className="block text-amber-400">💡 Dica Estratégica:</strong>
                        {generatedOutput.tips.map((t: string, idx: number) => (
                          <p key={idx}>{t}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CHECKLISTS OPERACIONAIS */}
        {/* ========================================================================= */}
        {activeTab === 'CHECKLISTS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar list of checklists */}
            <div className="lg:col-span-4 space-y-1.5 bg-[#12151B] p-3 rounded-2xl border border-zinc-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1 block">
                Selecione o Checklist
              </span>
              <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
                {ACADEMIA_CHECKLISTS.map((chk) => {
                  const isSelected = chk.id === selectedChecklistId;
                  return (
                    <button
                      key={chk.id}
                      onClick={() => setSelectedChecklistId(chk.id)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-white'
                      }`}
                    >
                      <CheckSquare className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <div className="overflow-hidden">
                        <span className="block truncate font-bold">{chk.name}</span>
                        <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{chk.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Checklist Canvas */}
            <div className="lg:col-span-8 space-y-5">
              <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">{currentChecklist.name}</h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {currentChecklist.frequency}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">{currentChecklist.description}</p>
                  </div>

                  <button
                    onClick={resetCurrentChecklist}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Desmarcar Todos</span>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Progresso deste Checklist</span>
                    <span className="text-amber-400 font-bold">
                      {completedChecklistCount} de {currentChecklist.items.length} itens ({checklistPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${checklistPercent}%` }}
                    />
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2.5 pt-2">
                  {currentChecklist.items.map((item) => {
                    const isChecked = Boolean(checkedTasks[item.id]);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleTask(item.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-zinc-300'
                            : 'bg-[#181B22] border-zinc-800/80 hover:border-zinc-700 text-zinc-200'
                        }`}
                      >
                        <div
                          className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                              : 'border-zinc-600 bg-zinc-900'
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <span
                            className={`text-xs sm:text-sm font-medium leading-relaxed block ${
                              isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {item.task}
                          </span>
                        </div>

                        {item.importance === 'CRITICA' && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                            Crítica
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
