import { createRouter, createWebHistory } from 'vue-router'
import TemplateView from '@/templates/TemplateView.vue'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', name: 'library', component: TemplateView },
        { path: '/discover', name: 'discover', component: TemplateView },
        { path: '/package/:id', name: 'detail', component: TemplateView, props: true },
        { path: '/operations', name: 'operations', component: TemplateView },
        { path: '/settings', name: 'settings', component: TemplateView },
        { path: '/:pathMatch(.*)*', redirect: '/' }
    ]
})

export default router
