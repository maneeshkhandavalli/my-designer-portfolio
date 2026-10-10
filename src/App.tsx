import { SmoothScroll } from '@/components/effects/SmoothScroll/SmoothScroll'
import { AppShell } from '@/components/layout/AppShell'
import { Contact } from '@/components/sections/Contact/Contact'
import { Hero } from '@/components/sections/Hero/Hero'
import { MidnightLabs } from '@/components/sections/MidnightLabs/MidnightLabs'
import { Projects } from '@/components/sections/Projects/Projects'
import { Skills } from '@/components/sections/Skills/Skills'
import { Statement } from '@/components/sections/Statement/Statement'
import { Story } from '@/components/sections/Story/Story'

// Section order mirrors SECTIONS in lib/sections.ts. Footer lives in AppShell.
export default function App() {
  return (
    <SmoothScroll>
      <AppShell>
        <Hero />
        <Story />
        <Statement />
        <Projects />
        <MidnightLabs />
        <Skills />
        <Contact />
      </AppShell>
    </SmoothScroll>
  )
}
