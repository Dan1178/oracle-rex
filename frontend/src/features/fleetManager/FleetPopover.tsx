import { UnitCounter } from '../../components/UnitCounter/UnitCounter'
import type { System } from '../../types/game'
import {
  FLEET_OWNER_OPTIONS,
  FLEET_UNITS,
  PLANET_OWNER_OPTIONS,
  PLANET_UNITS,
  DEFAULT_FLEET_OWNER,
  DEFAULT_PLANET_OWNER,
} from './fleetModel'
import styles from './FleetPopover.module.css'

// The fleet-management window, ported from templates/fleet_mgmt.html. The legacy
// version was a mouse-positioned popover whose counts were read/written through
// the DOM; here it is a controlled panel rendered for the active system, with
// every count derived from the System prop and every edit routed back up through
// callbacks. (The exact mouse-follow positioning is intentionally dropped, a
// fixed in-viewport panel is more robust; positioning polish is M6's job.)

export interface FleetPopoverProps {
  system: System
  onShipDelta: (unit: string, delta: number) => void
  onFleetOwnerChange: (owner: string) => void
  onGroundDelta: (planetIndex: number, unit: string, delta: number) => void
  onPlanetOwnerChange: (planetIndex: number, owner: string) => void
  onClose: () => void
}

export function FleetPopover({
  system,
  onShipDelta,
  onFleetOwnerChange,
  onGroundDelta,
  onPlanetOwnerChange,
  onClose,
}: FleetPopoverProps) {
  const fleetOwner = system.fleet?.owner || DEFAULT_FLEET_OWNER

  return (
    <div className={styles.window} role="dialog" aria-label="Fleet Management">
      <span className={styles.header}>Fleet Management</span>

      <section className={styles.section} aria-label="Fleet">
        <h3>Fleet</h3>
        <div className={styles.playerSelect}>
          <label htmlFor="fleet-owner">Owner:</label>
          <select
            id="fleet-owner"
            value={fleetOwner}
            onChange={(e) => onFleetOwnerChange(e.target.value)}
          >
            {FLEET_OWNER_OPTIONS.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.units}>
          {FLEET_UNITS.map((unit) => (
            <UnitCounter
              key={unit.unit}
              label={unit.label}
              icon={unit.icon}
              count={system.fleet?.ships[unit.unit] ?? 0}
              onIncrement={() => onShipDelta(unit.unit, 1)}
              onDecrement={() => onShipDelta(unit.unit, -1)}
            />
          ))}
        </div>
      </section>

      {system.planets.length > 0 && (
        <section className={styles.planets} aria-label="Planets">
          <h3>Planets</h3>
          <div className={styles.planetGrid}>
            {system.planets.map((planet, index) => {
              const owner = planet.ground_forces?.owner || DEFAULT_PLANET_OWNER
              const ownerId = `planet-${index}-owner`
              return (
                <div key={planet.name} className={styles.planetCard}>
                  <div className={styles.planetHead}>
                    <h4>{planet.name}</h4>
                    <div className={styles.playerSelect}>
                      <label htmlFor={ownerId}>Owner:</label>
                      <select
                        id={ownerId}
                        value={owner}
                        onChange={(e) => onPlanetOwnerChange(index, e.target.value)}
                      >
                        {PLANET_OWNER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={styles.units}>
                    {PLANET_UNITS.map((unit) => {
                      const isUnit = unit.unit === 'infantry' || unit.unit === 'mech'
                      const count = isUnit
                        ? (planet.ground_forces?.units[unit.unit] ?? 0)
                        : (planet.ground_forces?.structures[unit.unit] ?? 0)
                      return (
                        <UnitCounter
                          key={unit.unit}
                          label={`${planet.name} ${unit.label}`}
                          icon={unit.icon}
                          count={count}
                          onIncrement={() => onGroundDelta(index, unit.unit, 1)}
                          onDecrement={() => onGroundDelta(index, unit.unit, -1)}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <button type="button" className={styles.close} onClick={onClose}>
        Close
      </button>
    </div>
  )
}
