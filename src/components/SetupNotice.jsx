import { LanguageSwitcher, useI18n } from '../i18n/I18nProvider'

export default function SetupNotice() {
  const { t } = useI18n()
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <LanguageSwitcher className="mb-6" />
      <h1 className="text-2xl font-bold">{t('setup.title')}</h1>
      <p className="mt-3 text-stone-600">{t('setup.missing')}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-stone-600">
        <li>{t('setup.step1')}</li>
        <li>{t('setup.step2')}</li>
        <li>{t('setup.step3')}</li>
      </ol>
    </div>
  )
}
