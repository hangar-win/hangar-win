import { defineAsyncComponent, type Component } from 'vue'
import type { TemplateId } from '@/themes/tokens'

export type ViewName = 'library' | 'discover' | 'detail' | 'operations' | 'settings'

interface TemplateDefinition {
  layout: Component
  views: Record<ViewName, Component>
}

const lazy = (loader: () => Promise<any>) => defineAsyncComponent(loader)

export const templates: Record<TemplateId, TemplateDefinition> = {
  ledger: {
    layout: lazy(() => import('./ledger/LedgerLayout.vue')),
    views: {
      library: lazy(() => import('./ledger/LedgerLibrary.vue')),
      discover: lazy(() => import('./ledger/LedgerDiscover.vue')),
      detail: lazy(() => import('./ledger/LedgerDetail.vue')),
      operations: lazy(() => import('./ledger/LedgerOperations.vue')),
      settings: lazy(() => import('./ledger/LedgerSettings.vue'))
    }
  },
  metro: {
    layout: lazy(() => import('./metro/MetroLayout.vue')),
    views: {
      library: lazy(() => import('./metro/MetroLibrary.vue')),
      discover: lazy(() => import('./metro/MetroDiscover.vue')),
      detail: lazy(() => import('./metro/MetroDetail.vue')),
      operations: lazy(() => import('./metro/MetroOperations.vue')),
      settings: lazy(() => import('./metro/MetroSettings.vue'))
    }
  }
}
