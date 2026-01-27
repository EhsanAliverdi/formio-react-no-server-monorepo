import { Link } from "react-router-dom";

export type MexMaintenanceCard = {
  title: string;
  description: string;
  path: string;
  meta?: string;
};

interface MexMaintenanceSectionCardsProps {
  title: string;
  description: string;
  cards: MexMaintenanceCard[];
}

export default function MexMaintenanceSectionCards({
  title,
  description,
  cards,
}: MexMaintenanceSectionCardsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.path}
            className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm dark:border-gray-800 dark:bg-white/3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-800 group-hover:text-brand-600 dark:text-white/90">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {card.description}
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                {card.meta ?? "Open"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
