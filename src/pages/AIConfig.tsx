import { useState } from 'react'
import { useAIConfigStore } from '@/store/useAIConfigStore'
import { Key, Globe, Cpu, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react'

export default function AIConfig() {
  const aiConfig = useAIConfigStore((state) => state.getConfig())
  const setAIConfig = useAIConfigStore((state) => state.setConfig)
  const isAIConfigured = useAIConfigStore((state) => state.isConfigured())

  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const response = await fetch(aiConfig.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: 'user', content: '你好，请回复"连接成功' }],
          max_tokens: 10,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '未知错误')
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 100)}`)
      }

      const data = await response.json()
      if (data.choices && data.choices.length > 0) {
        setTestResult({ success: true, message: '连接成功！AI 服务正常可用' })
      } else {
        throw new Error('返回格式异常，请检查 API 地址和模型名称')
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '连接失败，请检查 API Key 和网络',
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-8">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold">AI 配置</h1>
        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all"
        >
          {saved ? '已保存' : '保存配置'}
        </button>
      </header>

      <div className="max-w-4xl space-y-6">
        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10B981]" />
            <h2 className="text-base font-bold">AI 服务配置</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            配置 AI 服务以启用智能搜索和解析功能。每个用户需要配置自己的 API Key，配置仅保存在本地浏览器中。
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <Globe size={12} />
                API 地址
              </label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={aiConfig.apiUrl}
                onChange={(e) => setAIConfig({ apiUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1/chat/completions"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                DeepSeek: https://api.deepseek.com/v1/chat/completions
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <Key size={12} />
                API Key
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={aiConfig.apiKey}
                onChange={(e) => setAIConfig({ apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="text-[10px] text-slate-400 mt-1">
                在 DeepSeek 官网获取 API Key，注册即送 500 万 token 免费额度
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                <Cpu size={12} />
                模型名称
              </label>
              <input
                className="w-full px-4 py-3 rounded-lg bg-white/80 border border-indigo-500/10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                value={aiConfig.model}
                onChange={(e) => setAIConfig({ model: e.target.value })}
                placeholder="deepseek-chat"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                推荐：deepseek-chat（DeepSeek 模型）
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-indigo-500/10">
              <div className="flex items-center gap-2">
                {isAIConfigured ? (
                  <>
                    <CheckCircle size={16} className="text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-semibold">AI 已配置</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} className="text-slate-400" />
                    <span className="text-xs text-slate-600">AI 未配置</span>
                  </>
                )}
              </div>
              <button
                onClick={handleTest}
                disabled={testing || !isAIConfigured}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all disabled:opacity-60 flex items-center gap-1.5"
              >
                {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                {testing ? '测试中...' : '测试连接'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-4 p-3 rounded-lg text-xs ${
                testResult.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                  <span className="font-semibold">{testResult.success ? '连接成功！' : '连接失败'}</span>
                </div>
                <p className="mt-1 opacity-80">{testResult.message}</p>
              </div>
            )}
          </div>
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_12px_#3B82F6]" />
            <h2 className="text-base font-bold">如何获取 DeepSeek API Key？</h2>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <ol className="text-xs text-blue-600 space-y-2 list-decimal list-inside">
              <li>访问 <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold hover:underline" onClick={(e) => { e.preventDefault(); window.open('https://platform.deepseek.com', '_blank'); }}>https://platform.deepseek.com</a></li>
              <li>注册账号并登录</li>
              <li>进入"API Keys"页面</li>
              <li>点击"创建 API Key"</li>
              <li>复制生成的 Key 并粘贴到上方输入框</li>
            </ol>
            <p className="text-[11px] text-blue-500 mt-3">
              查看额度：登录后在控制台"费用管理"页面查看余额和使用情况
            </p>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 glow-border">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_12px_#8B5CF6]" />
            <h2 className="text-base font-bold">配置说明</h2>
          </div>
          
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              <span className="font-semibold text-slate-700">独立配置：</span>
              每个用户需要配置自己的 API Key，配置保存在浏览器本地存储中，不会共享给其他用户。
            </p>
            <p>
              <span className="font-semibold text-slate-700">安全存储：</span>
              API Key 仅保存在你的浏览器中，不会上传到服务器，确保安全性。
            </p>
            <p>
              <span className="font-semibold text-slate-700">免费额度：</span>
              DeepSeek 注册即送 500 万 token 免费额度，足够日常使用。
            </p>
            <p>
              <span className="font-semibold text-slate-700">功能启用：</span>
              配置完成后，同人文搜索、AI 解析等功能将自动启用。
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
