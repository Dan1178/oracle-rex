import { FEATURE_MODEL_GROUPS, type ApiMake } from '../../store/models'
import { PERSONAS } from '../../store/personas'
import { useSettings } from '../../store/settingsContext'
import styles from './SettingsPanel.module.css'

// The Settings tab: the "three modes" blurb, the private live-demo access code,
// the three BYOK provider-key inputs, and the per-feature model radio groups.
// Ported from templates/settings.html, wired to the settings store instead of
// reading the DOM. The misleading "local storage" warning copy is corrected:
// keys are kept in memory for the session only.

interface ApiKeyField {
  make: ApiMake
  label: string
  placeholder: string
}

const API_KEY_FIELDS: ApiKeyField[] = [
  { make: 'xai', label: 'xAI API Key', placeholder: 'Enter your xAI API key' },
  { make: 'openai', label: 'OpenAI API Key', placeholder: 'Enter your OpenAI API key' },
  {
    make: 'anthropic',
    label: 'Anthropic API Key',
    placeholder: 'Enter your Anthropic (Claude) API key',
  },
]

export function SettingsPanel() {
  const {
    accessCode,
    apiKeys,
    models,
    persona,
    setAccessCode,
    setApiKey,
    setModel,
    setPersona,
  } = useSettings()

  return (
    <section className={styles.settings} aria-labelledby="settings-heading">
      <h2 id="settings-heading" className={styles.pageTitle}>
        Settings
      </h2>

      <div className={styles.demoBox}>
        <h4>Three ways to use Oracle Rex</h4>
        <ul className={styles.modesList}>
          <li>
            <strong>Demo mode</strong>: the fastest way to explore. Every feature has a
            one-click sample (look for the <em>Demo</em> boxes in each tab) backed by
            saved AI responses. No API key required.
          </li>
          <li>
            <strong>Live AI (BYOK)</strong>: paste your own provider API key below to
            generate fresh responses. Keys stay in this browser tab and are used only
            for your requests.
          </li>
          <li>
            <strong>Private live demo</strong>: if you were given an access code, enter
            it below to run live AI on a controlled, owner-provided key.
          </li>
        </ul>
      </div>

      <section className={styles.card} aria-labelledby="credentials-heading">
        <h3 id="credentials-heading" className={styles.cardTitle}>
          Live AI Credentials
        </h3>
        <p className={styles.info}>
          Gemini runs free with no key and is the default for every feature. To use the
          other providers (GPT, Grok, Claude), add an API key below, or enter a private
          live-demo access code.
        </p>

        <div className={styles.field}>
          <label htmlFor="live-demo-access-code">
            Live Demo Access Code (optional)
          </label>
          <input
            type="text"
            id="live-demo-access-code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Enter an access code to use the controlled live demo"
          />
          <small className={styles.hint}>
            When set, live AI requests use the owner&rsquo;s controlled key (cheap
            model, capped usage) instead of your own. Leave blank to use your own keys
            below.
          </small>
        </div>

        <div className={styles.keyFields}>
          {API_KEY_FIELDS.map((field) => (
            <div className={styles.field} key={field.make}>
              <label htmlFor={`${field.make}-api-key`}>{field.label}</label>
              <input
                type="password"
                id={`${field.make}-api-key`}
                value={apiKeys[field.make]}
                onChange={(e) => setApiKey(field.make, e.target.value)}
                placeholder={field.placeholder}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <p className={styles.warning}>
          Keys are kept in memory for this browser tab only. They are not saved to disk
          or local storage, and are cleared when you close or reload the tab.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="models-heading">
        <h3 id="models-heading" className={styles.cardTitle}>
          Model Selection
        </h3>
        <p className={styles.info}>
          Recommended models are selected. Be sure you have a corresponding API key for
          every AI type selected.
        </p>
        <p className={styles.modelWarn}>
          These are reasoning (&ldquo;thinking&rdquo;) models. They deliberate before
          answering, which improves quality but adds latency. The heaviest models
          (GPT-5.5, Grok 4.20) give the strongest answers but may occasionally time out
          on the hosted demo; the lighter models (GPT-5.4 mini/nano, Grok 4.3) respond
          faster.
        </p>

        {FEATURE_MODEL_GROUPS.map((group) => (
          <fieldset className={styles.modelGroup} key={group.feature}>
            <legend>{group.heading}</legend>
            <div className={styles.modelOptions}>
              {group.options.map((option) => {
                const id = `${group.feature}-${option.value}`
                return (
                  <label className={styles.radioLabel} htmlFor={id} key={option.value}>
                    <input
                      type="radio"
                      id={id}
                      name={`${group.feature}-ai-model`}
                      value={option.value}
                      checked={models[group.feature] === option.value}
                      onChange={() => setModel(group.feature, option.value)}
                    />
                    {option.label}
                    {option.apiMake === 'google' && (
                      <>
                        {' '}
                        (free, <span className={styles.freeNote}>rate-limited</span>)
                      </>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </section>

      <section className={styles.card} aria-labelledby="persona-heading">
        <h3 id="persona-heading" className={styles.cardTitle}>
          AI Personality
        </h3>
        <p className={styles.info}>
          Give Oracle Rex a voice. This changes tone only, not the accuracy of answers,
          and applies to live AI responses (not saved demo responses).
        </p>
        <div className={styles.field}>
          <label htmlFor="persona-select">Personality</label>
          <select
            id="persona-select"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </section>
    </section>
  )
}
