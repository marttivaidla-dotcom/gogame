import { useState } from 'react'
import { Card, ErrorBox, Loading, PageTitle, PlayerDot, useLoader } from '../components/ui'
import { useI18n } from '../i18n/I18nProvider'
import { addPlayer, deletePlayer, fetchPlayers, updatePlayer } from '../lib/api'

const COLORS = ['#059669', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#0891b2', '#4b5563']

export default function PlayersPage() {
  const { t } = useI18n()
  const { data: players, error: loadError, loading, reload } = useLoader(fetchPlayers)
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState(null)

  async function run(action) {
    setError(null)
    try {
      await action()
      await reload()
      return true
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (await run(() => addPlayer(name, color))) {
      setName('')
      setColor(COLORS[(COLORS.indexOf(color) + 1) % COLORS.length])
    }
  }

  return (
    <div>
      <PageTitle subtitle={t('players.subtitle')}>{t('players.title')}</PageTitle>
      <ErrorBox>{loadError || error}</ErrorBox>

      <Card className="mb-6">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <label className="flex-1 text-sm font-medium">
            {t('players.name')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder={t('players.namePlaceholder')}
              className="mt-1 block w-full min-w-40 rounded-md border border-stone-300 px-3 py-2"
            />
          </label>
          <ColorPicker value={color} onChange={setColor} />
          <button type="submit" className="rounded-md bg-stone-900 px-4 py-2 font-medium text-white hover:bg-stone-700">
            {t('players.add')}
          </button>
        </form>
      </Card>

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-2">
          {players?.map((p) => (
            <PlayerRow
              key={p.id}
              player={p}
              onSave={(fields) => run(() => updatePlayer(p.id, fields))}
              onDelete={() => confirm(t('players.deleteConfirm', { name: p.name })) && run(() => deletePlayer(p.id))}
            />
          ))}
          {players?.length === 0 && <p className="py-8 text-center text-stone-400">{t('players.empty')}</p>}
        </div>
      )}
    </div>
  )
}

function PlayerRow({ player, onSave, onDelete }) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(player.name)
  const [color, setColor] = useState(player.color)

  async function save() {
    if (await onSave({ name: name.trim(), color })) setEditing(false)
  }

  if (editing) {
    return (
      <Card className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          className="flex-1 rounded-md border border-stone-300 px-3 py-1.5"
        />
        <ColorPicker value={color} onChange={setColor} />
        <button type="button" onClick={save} className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white">
          {t('players.save')}
        </button>
        <button type="button" onClick={() => setEditing(false)} className="text-sm text-stone-500">
          {t('players.cancel')}
        </button>
      </Card>
    )
  }

  return (
    <Card className="flex items-center gap-3">
      <PlayerDot color={player.color} />
      <span className="flex-1 font-medium">{player.name}</span>
      <button type="button" onClick={() => setEditing(true)} className="text-sm text-stone-500 hover:text-stone-900">
        {t('players.edit')}
      </button>
      <button type="button" onClick={onDelete} className="text-sm text-red-600 hover:underline">
        {t('players.delete')}
      </button>
    </Card>
  )
}

function ColorPicker({ value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="flex gap-1.5 py-2">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={t('players.color', { color: c })}
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full ${value === c ? 'ring-2 ring-stone-900 ring-offset-2' : ''}`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}
