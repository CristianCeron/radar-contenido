"use client";

interface BrandToggleProps {
  profiles: { id: string; nombre: string }[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

// Selector de marca en forma de píldora, sobre fondo oscuro.
export function BrandToggle({ profiles, value, onChange, disabled = false }: BrandToggleProps) {
  return (
    <div role="group" aria-label="Marca" className="grid w-full auto-cols-fr grid-flow-col rounded-full border border-ink-line bg-ink-3 p-1 sm:inline-flex sm:w-auto sm:self-start">
      {profiles.map((p) => {
        const on = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => !on && onChange(p.id)}
            className={`min-h-11 cursor-pointer rounded-full px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:cursor-wait sm:px-5 ${
              on ? "bg-accent text-ink" : "text-soft hover:text-white"
            }`}
          >
            {p.nombre}
          </button>
        );
      })}
    </div>
  );
}
