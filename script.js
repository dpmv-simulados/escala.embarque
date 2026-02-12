class SistemaEmbarquesAndroid {
    constructor() {
        this.usuarioAtual = null;
        this.calendar = null;
        this.embarqueChart = null;
        this.projecaoChart = null;
        this.init();
    }

    async init() {
        await this.carregarDadosIniciais();
        this.initEventListeners();
        setTimeout(() => this.hideSplash(), 1500);
    }

    carregarDadosIniciais() {
        if (!localStorage.getItem('usuarios')) {
            // Criar usuário padrão para teste
            const usuarios = [{
                id: '1',
                username: 'teste',
                password: '123456',
                fullname: 'Usuário Teste',
                configuracoes: {
                    nextEmbarqueDate: null,
                    diasEmbarcado: null,
                    notificacoes: true
                },
                estatisticas: {
                    totalEmbarques: 0,
                    totalDiasMar: 0,
                    totalDiasCasa: 0
                },
                createdAt: new Date().toISOString()
            }];
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
    }

    hideSplash() {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.display = 'none';
        }
    }

    initEventListeners() {
        window.addEventListener('beforeunload', () => {
            if (this.usuarioAtual) {
                this.salvarDadosUsuario();
            }
        });
    }

    // ============ AUTENTICAÇÃO ============
    registrarUsuario(username, password, fullname) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        
        if (usuarios.find(u => u.username === username)) {
            this.showToast('Usuário já existe!', 'error');
            return false;
        }

        const novoUsuario = {
            id: Date.now().toString(),
            username,
            password,
            fullname,
            configuracoes: {
                nextEmbarqueDate: null,
                diasEmbarcado: null,
                notificacoes: true
            },
            estatisticas: {
                totalEmbarques: 0,
                totalDiasMar: 0,
                totalDiasCasa: 0
            },
            createdAt: new Date().toISOString()
        };

        usuarios.push(novoUsuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        this.showToast('Conta criada com sucesso!', 'success');
        return true;
    }

    login(username, password) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const usuario = usuarios.find(u => u.username === username && u.password === password);
        
        if (usuario) {
            this.usuarioAtual = usuario;
            
            // CORREÇÃO CRÍTICA: Esconder auth e mostrar dashboard
            const authScreen = document.getElementById('auth-screen');
            const dashboard = document.getElementById('dashboard');
            
            if (authScreen) authScreen.style.display = 'none';
            if (dashboard) {
                dashboard.style.display = 'block'; // Mudamos para block ao invés de flex
                dashboard.classList.add('active');
            }
            
            this.atualizarInterfaceUsuario();
            this.showToast(`Bem-vindo, ${usuario.fullname || usuario.username}!`, 'success');
            return true;
        }
        this.showToast('Usuário ou senha inválidos!', 'error');
        return false;
    }

    logout() {
        if (this.usuarioAtual) {
            this.salvarDadosUsuario();
            this.usuarioAtual = null;
            
            const authScreen = document.getElementById('auth-screen');
            const dashboard = document.getElementById('dashboard');
            
            if (authScreen) authScreen.style.display = 'flex';
            if (dashboard) {
                dashboard.style.display = 'none';
                dashboard.classList.remove('active');
            }
            
            this.showToast('Até logo!', 'success');
        }
    }

    // ============ INTERFACE ============
    atualizarInterfaceUsuario() {
        if (!this.usuarioAtual) return;
        
        // Atualizar nome do usuário
        const userNameEl = document.getElementById('user-name');
        const userLoginEl = document.getElementById('user-login');
        const userBadgeEl = document.getElementById('current-user-badge');
        
        if (userNameEl) userNameEl.textContent = this.usuarioAtual.fullname || this.usuarioAtual.username;
        if (userLoginEl) userLoginEl.textContent = `@${this.usuarioAtual.username}`;
        if (userBadgeEl) userBadgeEl.innerHTML = `<i class="fas fa-user"></i> ${this.usuarioAtual.fullname || this.usuarioAtual.username}`;
        
        // Preencher perfil
        const profileFullname = document.getElementById('profile-fullname');
        const profileUsername = document.getElementById('profile-username');
        
        if (profileFullname) profileFullname.value = this.usuarioAtual.fullname || '';
        if (profileUsername) profileUsername.value = this.usuarioAtual.username;
        
        // Carregar configurações salvas
        if (this.usuarioAtual.configuracoes) {
            const nextDateInput = document.getElementById('next-embarque-date');
            const diasInput = document.getElementById('dias-embarcado');
            
            if (this.usuarioAtual.configuracoes.nextEmbarqueDate && nextDateInput) {
                nextDateInput.value = this.usuarioAtual.configuracoes.nextEmbarqueDate;
            }
            if (this.usuarioAtual.configuracoes.diasEmbarcado && diasInput) {
                diasInput.value = this.usuarioAtual.configuracoes.diasEmbarcado;
            }
        }
        
        // Mostrar página inicial
        this.showPage('calendar');
        
        // Inicializar componentes
        setTimeout(() => {
            this.inicializarCalendario();
            this.calcularProjecao2Anos();
            this.atualizarEstatisticas();
        }, 300);
    }

    showPage(pageName) {
        // Remover active de todas as páginas
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Ativar página selecionada
        const selectedPage = document.getElementById(`${pageName}-page`);
        if (selectedPage) {
            selectedPage.classList.add('active');
        }
        
        // Ativar menu correspondente
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const navItems = document.querySelectorAll('.nav-item');
        if (pageName === 'calendar' && navItems[0]) navItems[0].classList.add('active');
        if (pageName === 'projecao' && navItems[1]) navItems[1].classList.add('active');
        if (pageName === 'estatisticas' && navItems[2]) navItems[2].classList.add('active');
        if (pageName === 'config' && navItems[3]) navItems[3].classList.add('active');
        
        // Recarregar dados conforme página
        if (pageName === 'projecao') {
            setTimeout(() => {
                this.calcularProjecao2Anos();
                this.gerarMiniCalendario();
            }, 100);
        }
        if (pageName === 'estatisticas') {
            setTimeout(() => {
                this.atualizarEstatisticas();
            }, 100);
        }
    }

    // ============ PROJEÇÃO 2 ANOS ============
    calcularProjecao2Anos() {
        if (!this.usuarioAtual?.configuracoes?.nextEmbarqueDate || !this.usuarioAtual?.configuracoes?.diasEmbarcado) {
            return;
        }

        const startDate = new Date(this.usuarioAtual.configuracoes.nextEmbarqueDate);
        const diasEmbarcado = this.usuarioAtual.configuracoes.diasEmbarcado;
        
        let totalEmbarques = 0;
        let totalDiasMar = 0;
        const timeline = [];
        
        for (let i = 0; i < 24; i++) {
            const mes = new Date(startDate);
            mes.setMonth(startDate.getMonth() + i);
            
            const diasMes = [];
            for (let j = 0; j < 30; j++) {
                if (j < diasEmbarcado) {
                    diasMes.push({ status: 'embarcado', dia: j + 1 });
                    totalDiasMar++;
                    if (j === 0) totalEmbarques++;
                } else {
                    diasMes.push({ status: 'folga', dia: j + 1 });
                }
            }
            
            timeline.push({
                mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                dias: diasMes
            });
        }

        this.usuarioAtual.estatisticas = {
            totalEmbarques,
            totalDiasMar,
            totalDiasCasa: (24 * 30) - totalDiasMar,
            timeline
        };

        this.renderTimeline(timeline);
        
        // Atualizar estatísticas na UI
        const totalEmbarquesEl = document.getElementById('total-embarques');
        const totalDiasMarEl = document.getElementById('total-dias-mar');
        const totalDiasCasaEl = document.getElementById('total-dias-casa');
        
        if (totalEmbarquesEl) totalEmbarquesEl.textContent = totalEmbarques;
        if (totalDiasMarEl) totalDiasMarEl.textContent = totalDiasMar;
        if (totalDiasCasaEl) totalDiasCasaEl.textContent = (24 * 30) - totalDiasMar;

        this.atualizarGraficos();
        this.gerarMiniCalendario();
    }

    renderTimeline(timeline) {
        const container = document.getElementById('timeline-2anos');
        if (!container) return;
        
        container.innerHTML = '';
        
        timeline.slice(0, 12).forEach((mes) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'timeline-month';
            
            const header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = mes.mes;
            
            const days = document.createElement('div');
            days.className = 'month-days';
            
            mes.dias.slice(0, 15).forEach(dia => {
                const dayBlock = document.createElement('div');
                dayBlock.className = `day-block ${dia.status}`;
                days.appendChild(dayBlock);
            });
            
            monthDiv.appendChild(header);
            monthDiv.appendChild(days);
            container.appendChild(monthDiv);
        });
    }

    gerarMiniCalendario() {
        const container = document.getElementById('projection-minicalendar');
        if (!container) return;
        
        container.innerHTML = '';
        
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const ano = new Date().getFullYear();
        
        meses.forEach((mes, index) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'mini-month';
            
            const title = document.createElement('h4');
            title.textContent = `${mes}/${ano}`;
            
            const days = document.createElement('div');
            days.className = 'mini-days';
            
            for (let i = 0; i < 20; i++) {
                const day = document.createElement('div');
                day.className = 'day-block';
                days.appendChild(day);
            }
            
            monthDiv.appendChild(title);
            monthDiv.appendChild(days);
            container.appendChild(monthDiv);
        });
    }

    // ============ CALENDÁRIO ============
    inicializarCalendario() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) return;
        
        calendarEl.innerHTML = '';

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth'
            },
            events: this.gerarEventosComProjecao(),
            height: 'auto',
            contentHeight: 'auto',
            aspectRatio: 1.5
        });

        this.calendar.render();
    }

    gerarEventosComProjecao() {
        const eventos = [];
        
        if (this.usuarioAtual?.configuracoes?.nextEmbarqueDate && this.usuarioAtual?.configuracoes?.diasEmbarcado) {
            const startDate = new Date(this.usuarioAtual.configuracoes.nextEmbarqueDate);
            const dias = this.usuarioAtual.configuracoes.diasEmbarcado;
            
            eventos.push({
                title: '🚢 Início do Embarque',
                start: startDate.toISOString().split('T')[0],
                color: '#2196F3',
                textColor: 'white'
            });

            for (let i = 0; i < dias; i++) {
                const eventDate = new Date(startDate);
                eventDate.setDate(startDate.getDate() + i);
                
                eventos.push({
                    title: '⚓ Embarcado',
                    start: eventDate.toISOString().split('T')[0],
                    color: '#F44336',
                    textColor: 'white'
                });
            }
        }

        return eventos;
    }

    // ============ ESTATÍSTICAS ============
    atualizarEstatisticas() {
        this.atualizarGraficos();
        this.gerarResumoAnual();
    }

    atualizarGraficos() {
        setTimeout(() => {
            this.atualizarGraficoEmbarques();
            this.atualizarGraficoProjecao();
        }, 200);
    }

    atualizarGraficoEmbarques() {
        const canvas = document.getElementById('embarqueChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (this.embarqueChart) {
            this.embarqueChart.destroy();
        }

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const diasEmbarcado = this.usuarioAtual?.configuracoes?.diasEmbarcado || 15;
        const dados = meses.map(() => diasEmbarcado);

        this.embarqueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Dias Embarcados',
                    data: dados,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    atualizarGraficoProjecao() {
        const canvas = document.getElementById('projecaoChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (this.projecaoChart) {
            this.projecaoChart.destroy();
        }

        const diasMar = this.usuarioAtual?.estatisticas?.totalDiasMar || 180;
        const diasCasa = this.usuarioAtual?.estatisticas?.totalDiasCasa || 185;

        this.projecaoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Dias no Mar', 'Dias em Casa'],
                datasets: [{
                    data: [diasMar, diasCasa],
                    backgroundColor: ['#F44336', '#4CAF50'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    gerarResumoAnual() {
        const container = document.getElementById('resumo-anual');
        if (!container) return;
        
        const anos = [2025, 2026];
        const diasEmbarcado = this.usuarioAtual?.configuracoes?.diasEmbarcado || 15;
        
        let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">';
        anos.forEach(ano => {
            html += `
                <div style="background: #F5F7FA; padding: 16px; border-radius: 12px; text-align: center;">
                    <h4 style="margin-bottom: 8px; color: #263238;">${ano}</h4>
                    <p style="color: #78909C; margin-bottom: 4px;">Embarques: 12</p>
                    <p style="color: #78909C; margin-bottom: 4px;">Dias no mar: ${diasEmbarcado * 12}</p>
                    <p style="color: #78909C;">Dias em casa: ${365 - (diasEmbarcado * 12)}</p>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    // ============ CONFIGURAÇÕES ============
    salvarConfiguracaoEmbarque() {
        const nextDate = document.getElementById('next-embarque-date')?.value;
        const dias = parseInt(document.getElementById('dias-embarcado')?.value);

        if (!nextDate || !dias) {
            this.showToast('Preencha todos os campos!', 'error');
            return false;
        }

        if (this.usuarioAtual) {
            this.usuarioAtual.configuracoes = {
                ...this.usuarioAtual.configuracoes,
                nextEmbarqueDate: nextDate,
                diasEmbarcado: dias
            };

            this.salvarDadosUsuario();
            this.inicializarCalendario();
            this.calcularProjecao2Anos();
            this.showToast('Configuração salva!', 'success');
            return true;
        }
        return false;
    }

    atualizarPerfil() {
        const nome = document.getElementById('profile-fullname')?.value;
        const senha = document.getElementById('profile-password')?.value;

        if (nome) {
            this.usuarioAtual.fullname = nome;
        }
        
        if (senha) {
            this.usuarioAtual.password = senha;
        }

        this.salvarDadosUsuario();
        this.atualizarInterfaceUsuario();
        this.showToast('Perfil atualizado!', 'success');
        document.getElementById('profile-password').value = '';
    }

    salvarDadosUsuario() {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const index = usuarios.findIndex(u => u.id === this.usuarioAtual.id);
        if (index !== -1) {
            usuarios[index] = this.usuarioAtual;
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
        }
    }

    exportarDados() {
        const dados = {
            usuario: this.usuarioAtual,
            exportado: new Date().toISOString(),
            versao: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `embarques-${this.usuarioAtual.username}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Backup exportado!', 'success');
    }

    // ============ UI UTILS ============
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        let bgColor = '#263238';
        if (type === 'success') bgColor = '#4CAF50';
        if (type === 'error') bgColor = '#F44336';
        toast.style.backgroundColor = bgColor;
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Instância global
const sistema = new SistemaEmbarquesAndroid();

// ============ FUNÇÕES GLOBAIS ============
function showTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(btn => btn.classList.remove('active'));
    forms.forEach(form => form.classList.remove('active'));
    
    if (tabName === 'login') {
        if (tabs[0]) tabs[0].classList.add('active');
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.classList.add('active');
    } else {
        if (tabs[1]) tabs[1].classList.add('active');
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.classList.add('active');
    }
}

function register() {
    const username = document.getElementById('reg-username')?.value;
    const password = document.getElementById('reg-password')?.value;
    const fullname = document.getElementById('reg-fullname')?.value;

    if (username && password && fullname) {
        if (sistema.registrarUsuario(username, password, fullname)) {
            showTab('login');
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            document.getElementById('reg-fullname').value = '';
        }
    } else {
        sistema.showToast('Preencha todos os campos!', 'error');
    }
}

function login() {
    const username = document.getElementById('login-username')?.value;
    const password = document.getElementById('login-password')?.value;
    sistema.login(username, password);
}

function logout() {
    sistema.logout();
}

function showPage(pageName) {
    sistema.showPage(pageName);
}

function toggleSidebar() {
    sistema.toggleSidebar();
}

function closeSidebar() {
    sistema.closeSidebar();
}

function salvarConfiguracao() {
    sistema.salvarConfiguracaoEmbarque();
}

function atualizarPerfil() {
    sistema.atualizarPerfil();
}

function exportarDados() {
    sistema.exportarDados();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    showTab('login');
    
    // Garantir estado inicial correto
    const authScreen = document.getElementById('auth-screen');
    const dashboard = document.getElementById('dashboard');
    
    if (authScreen) authScreen.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
});
