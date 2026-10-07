import { CatalogSection, MobileCatalogBar } from './components/catalog-section'
import { Journal, Promos } from './components/editorial'
import { Hero } from './components/hero'

export function HomePage() {
  return (
    <div className="flex flex-col gap-6 md:gap-0">
      <MobileCatalogBar />
      <div className="flex flex-col gap-10 md:gap-24 md:pt-8">
        <Hero />
        <CatalogSection />
        <Promos />
        <Journal />
      </div>
    </div>
  )
}
