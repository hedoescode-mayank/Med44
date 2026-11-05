import React, { useState, useEffect } from 'react'
import { journeyApi } from '../services/api'
import {
  Compass,
  CheckCircle2,
  Circle,
  HelpCircle,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  GitBranch,
  Languages,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react'

interface JourneyNode {
  id: string
  template_id: string
  title: string
  title_hi?: string
  description: string
  description_hi?: string
  node_type: string
  phase: string
  order_index: number
  what_to_bring: string[]
  questions_to_ask: string[]
  conditional_branches: {
    condition: string
    condition_hi?: string
    action_label: string
    target_node_id?: string
  }[]
}

interface JourneyTemplate {
  id: string
  title: string
  title_hi?: string
  description: string
  category: string
  target_condition: string
  nodes: JourneyNode[]
}

interface JourneyProgress {
  template_id: string
  current_node_id: string
  completed_node_ids: string[]
  preparation_checklist: { item: string; done: boolean }[]
  selected_branches: Record<string, string>
  status: string
}

export const JourneyPage: React.FC = () => {
  const [templates, setTemplates] = useState<JourneyTemplate[]>([])
  const [activeTemplateId, setActiveTemplateId] = useState<string>('dental_care')
  const [activeTemplate, setActiveTemplate] = useState<JourneyTemplate | null>(null)
  const [progress, setProgress] = useState<JourneyProgress | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [language, setLanguage] = useState<'en' | 'hi'>('en')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tRes, pRes] = await Promise.all([
        journeyApi.getTemplates(),
        journeyApi.getMyProgress()
      ])
      setTemplates(tRes.data || [])
      if (pRes.data && pRes.data.template_id) {
        setProgress(pRes.data)
        setActiveTemplateId(pRes.data.template_id)
      } else if (tRes.data && tRes.data.length > 0) {
        setActiveTemplateId(tRes.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load care journeys:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTemplateId) {
      loadTemplate(activeTemplateId)
    }
  }, [activeTemplateId])

  const loadTemplate = async (templateId: string) => {
    try {
      const res = await journeyApi.getTemplate(templateId)
      setActiveTemplate(res.data)
      if (res.data?.nodes?.length > 0 && !selectedNodeId) {
        setSelectedNodeId(res.data.nodes[0].id)
      }
    } catch (err) {
      console.error('Failed to load template details:', err)
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    try {
      setActionLoading(true)
      setActiveTemplateId(templateId)
      const res = await journeyApi.selectTemplate(templateId)
      setProgress(res.data)
      await loadTemplate(templateId)
      if (res.data?.current_node_id) {
        setSelectedNodeId(res.data.current_node_id)
      }
    } catch (err) {
      console.error('Failed to select care journey:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleNode = async (nodeId: string) => {
    try {
      setActionLoading(true)
      const res = await journeyApi.toggleNode(nodeId)
      setProgress(res.data)
    } catch (err) {
      console.error('Failed to toggle node:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleChecklist = async (item: string) => {
    try {
      const res = await journeyApi.toggleChecklist(item)
      setProgress(res.data)
    } catch (err) {
      console.error('Failed to toggle checklist:', err)
    }
  }

  const handleSelectBranch = async (nodeId: string, choice: string) => {
    try {
      setActionLoading(true)
      const res = await journeyApi.selectBranch(nodeId, choice)
      setProgress(res.data)
    } catch (err) {
      console.error('Failed to select branch:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const selectedNode = activeTemplate?.nodes?.find((n) => n.id === selectedNodeId) || activeTemplate?.nodes?.[0]
  const completedNodes = progress?.completed_node_ids || []
  const totalNodes = activeTemplate?.nodes?.length || 0
  const completedCount = completedNodes.filter((id) =>
    activeTemplate?.nodes?.some((n) => n.id === id)
  ).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Compass className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                {language === 'hi' ? 'इंटरैक्टिव केयर जर्नी और फ्लोचार्ट' : 'Interactive Care Journey & Pathway'}
              </h1>
              <p className="text-sm text-stone-500">
                {language === 'hi'
                  ? 'अपनी उपचार प्रक्रिया को समझें, तैयारी की चेकलिस्ट पूरी करें और सही सवाल पूछें।'
                  : 'Understand each clinical phase, prepare required documents, and track step-by-step progress.'}
              </p>
            </div>
          </div>
        </div>

        {/* Language & Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-stone-200 hover:bg-stone-50 transition text-stone-700"
          >
            <Languages className="w-4 h-4 text-emerald-600" />
            <span>{language === 'en' ? 'हिंदी में देखें' : 'View in English'}</span>
          </button>
        </div>
      </div>

      {/* Pathway Template Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {templates.map((tpl) => {
          const isActive = tpl.id === activeTemplateId
          return (
            <button
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl.id)}
              disabled={actionLoading}
              className={`p-4 rounded-xl text-left border transition relative flex flex-col justify-between ${
                isActive
                  ? 'bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                  : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-stone-50/50'
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 mb-2 inline-block">
                  {tpl.category}
                </span>
                <h4 className="font-semibold text-stone-900 text-sm">
                  {language === 'hi' && tpl.title_hi ? tpl.title_hi : tpl.title}
                </h4>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  {tpl.description}
                </p>
              </div>
              {isActive && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Active Pathway</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Progress & Educational Disclaimer Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg text-emerald-200">
            {totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0}%
          </div>
          <div>
            <h3 className="font-bold text-base">
              {language === 'hi' ? 'केयर पाथवे प्रगति' : 'Pathway Milestones Completed'}
            </h3>
            <p className="text-xs text-emerald-100/90">
              {completedCount} of {totalNodes} clinical stages logged. This represents verified task completion, not an autonomous AI cure assessment.
            </p>
          </div>
        </div>
        <div className="text-xs bg-emerald-950/40 border border-emerald-400/20 px-3 py-2 rounded-xl text-emerald-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-300 flex-shrink-0" />
          <span>Clinical educational aid only. Always consult your attending doctor.</span>
        </div>
      </div>

      {/* Main Flowchart & Detail View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Connected Step Nodes Flowchart (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm">
            <h3 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-emerald-600" />
              <span>{language === 'hi' ? 'क्लीनिकल स्टेप्स फ्लोचार्ट' : 'Clinical Steps Flowchart'}</span>
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
              {activeTemplate?.nodes?.map((node, idx) => {
                const isCompleted = completedNodes.includes(node.id)
                const isSelected = selectedNode?.id === node.id
                return (
                  <div key={node.id} className="relative group">
                    {/* Circle icon on the timeline */}
                    <div
                      className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center transition ${
                        isCompleted
                          ? 'bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-50'
                          : isSelected
                          ? 'bg-teal-600 text-white ring-4 ring-teal-50'
                          : 'bg-stone-100 text-stone-400 border border-stone-300'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span className="text-[11px] font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step Card */}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                              {node.phase}
                            </span>
                            <span className="text-[10px] font-medium text-stone-500">
                              Type: {node.node_type}
                            </span>
                          </div>
                          <h4 className="font-semibold text-stone-900 mt-1 text-sm">
                            {language === 'hi' && node.title_hi ? node.title_hi : node.title}
                          </h4>
                          <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                            {language === 'hi' && node.description_hi ? node.description_hi : node.description}
                          </p>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 text-stone-400 group-hover:text-stone-700 transition ${
                            isSelected ? 'rotate-90 text-emerald-600' : ''
                          }`}
                        />
                      </div>

                      {/* Action pill: Mark Done */}
                      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleNode(node.id)
                          }}
                          className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-700 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isCompleted ? 'Marked Complete' : 'Mark as Done'}</span>
                        </button>
                        <span className="text-stone-400 text-[11px]">Click to inspect requirements</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Node Clinical Details & Checklists (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedNode ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-sm space-y-5">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  Phase: {selectedNode.phase}
                </span>
                <h3 className="text-lg font-bold text-stone-900 mt-0.5">
                  {language === 'hi' && selectedNode.title_hi ? selectedNode.title_hi : selectedNode.title}
                </h3>
                <p className="text-xs text-stone-600 mt-2 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                  {language === 'hi' && selectedNode.description_hi
                    ? selectedNode.description_hi
                    : selectedNode.description}
                </p>
              </div>

              {/* What to Bring Section */}
              {selectedNode.what_to_bring && selectedNode.what_to_bring.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'hi' ? 'साथ में क्या लाएं?' : 'What to Bring to Clinic?'}</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedNode.what_to_bring.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-stone-700 flex items-start gap-2 bg-stone-50/80 px-3 py-2 rounded-lg border border-stone-100"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Questions to Ask Doctor */}
              {selectedNode.questions_to_ask && selectedNode.questions_to_ask.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-teal-600" />
                    <span>{language === 'hi' ? 'डॉक्टर से क्या पूछें?' : 'Questions to Ask Provider'}</span>
                  </h4>
                  <div className="space-y-1.5">
                    {selectedNode.questions_to_ask.map((q, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-stone-700 bg-teal-50/50 p-2.5 rounded-lg border border-teal-100/80 flex items-start gap-2"
                      >
                        <span className="font-bold text-teal-700 text-xs">Q{idx + 1}:</span>
                        <span>{q}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Decision Branches */}
              {selectedNode.conditional_branches && selectedNode.conditional_branches.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>{language === 'hi' ? 'स्थिति अनुसार विकल्प' : 'Symptom & Scenario Branches'}</span>
                  </h4>
                  <div className="space-y-2">
                    {selectedNode.conditional_branches.map((b, idx) => {
                      const isChosen = progress?.selected_branches?.[selectedNode.id] === b.action_label
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-xs transition ${
                            isChosen
                              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <p className="font-medium text-stone-800">
                            {language === 'hi' && b.condition_hi ? b.condition_hi : b.condition}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] text-stone-500">Action: {b.action_label}</span>
                            <button
                              onClick={() => handleSelectBranch(selectedNode.id, b.action_label)}
                              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                                isChosen
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white border border-stone-300 hover:bg-stone-100 text-stone-700'
                              }`}
                            >
                              {isChosen ? 'Selected' : 'Select Branch'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Interactive Preparation Checklist for this Journey */}
              {progress?.preparation_checklist && progress.preparation_checklist.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'hi' ? 'तैयारी की चेकलिस्ट' : 'Preparation Checklist'}</span>
                  </h4>
                  <div className="space-y-1.5">
                    {progress.preparation_checklist.map((chk, idx) => (
                      <label
                        key={idx}
                        onClick={() => handleToggleChecklist(chk.item)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          chk.done
                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900 line-through'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={chk.done}
                          readOnly
                          className="w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500"
                        />
                        <span>{chk.item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-stone-400">
              Select a step node on the left to review instructions.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default JourneyPage

