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
        this.hideSplash();
    }

    carregarDadosIniciais() {
        if (!localStorage.getItem('usuarios')) {
            localStorage.setItem('usuarios', JSON.stringify([]));
        }
        
        // Verificar última sessão
        const ultimoUsuario = localStorage.getItem('ultimoUsuario');
        if (ultimoUsuario) {
            try {
                const usuario = JSON.parse(ultimoUsuario);
                this.autoLogin(usuario);
            } catch (e) {
                console.log('Sessão expirada');
            }
        }
    }

    autoLogin(usuario) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const usuarioExistente = usuarios.find(u => u.id === usuario.id);
        if (usuarioExistente) {
            this.usuarioAtual = usuarioExistente;
            document.getElementById('auth-screen').classList.remove('active');
            document.getElementById('dashboard').classList.add('active');
            this.atualizarInterfaceUsuario();
        }
    }

    hideSplash() {
        setTimeout(() => {
            document.getElementById('splash-screen').style.display = 'none';
        }, 1500);
    }

    initEventListeners() {
        // Fechar sidebar ao clicar no overlay
        document.getElementById('sidebar-overlay').addEventListener('click', () => this.closeSidebar());
        
        // Prevenir zoom em inputs no Android
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('focus', () => {
                document.body.style.zoom = '1';
            });
        });

        // Salvar dados antes de sair
        window.addEventListener('beforeunload', () => {
            if (this.usuarioAtual) {
                this.salvarDadosUsuario();
                localStorage.setItem('ultimoUsuario', JSON.stringify(this.usuarioAtual));
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
                notificacoes: true,
                diasFolga: 15 // padrão
            },
            estatisticas: {
                totalEmbarques: 0,
                totalDiasMar: 0,
                historico: []
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
            this.atualizarInterfaceUsuario();
            localStorage.setItem('ultimoUsuario', JSON.stringify(usuario));
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
            localStorage.removeItem('ultimoUsuario');
            document.getElementById('auth-screen').classList.add('active');
            document.getElementById('dashboard').classList.remove('active');
            this.showToast('Até logo!', 'success');
        }
    }

    // ============ INTERFACE ============
    atualizarInterfaceUsuario() {
        if (this.usuarioAtual) {
            document.getElementById('user-name').textContent = this.usuarioAtual.fullname || this.usuarioAtual.username;
            document.getElementById('user-login').textContent = `@${this.usuarioAtual.username}`;
            document.getElementById('current-user-badge').innerHTML = `<i class="fas fa-user"></i> ${this.usuarioAtual.fullname || this.usuarioAtual.username}`;
            
            document.getElementById('profile-fullname').value = this.usuarioAtual.fullname || '';
            document.getElementById('profile-username').value = this.usuarioAtual.username;
            
            if (this.usuarioAtual.configuracoes) {
                if (this.usuarioAtual.configuracoes.nextEmbarqueDate) {
                    document.getElementById('next-embarque-date').value = this.usuarioAtual.configuracoes.nextEmbarqueDate;
                }
                if (this.usuarioAtual.configuracoes.diasEmbarcado) {
                    document.getElementById('dias-embarcado').value = this.usuarioAtual.configuracoes.diasEmbarcado;
                }
            }
            
            this.inicializarCalendario();
            this.calcularProjecao2Anos();
            this.atualizarEstatisticas();
            this.gerarMiniCalendario();
        }
    }

    // ============ PROJEÇÃO 2 ANOS ============
    calcularProjecao2Anos() {
        if (!this.usuarioAtual?.configuracoes?.nextEmbarqueDate || !this.usuarioAtual?.configuracoes?.diasEmbarcado) {
            return;
        }

        const startDate = new Date(this.usuarioAtual.configuracoes.nextEmbarqueDate);
        const diasEmbarcado = this.usuarioAtual.configuracoes.diasEmbarcado;
        const diasFolga = 30 - diasEmbarcado; // Ciclo de 30 dias
        
        let totalEmbarques = 0;
        let totalDiasMar = 0;
        const timeline = [];
        
        // Projeção para 24 meses
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

        // Atualizar estatísticas
        this.usuarioAtual.estatisticas = {
            totalEmbarques,
            totalDiasMar,
            totalDiasCasa: (24 * 30) - totalDiasMar,
            timeline
        };

        // Renderizar timeline
        this.renderTimeline(timeline);
        
        // Atualizar cards de estatísticas
        document.getElementById('total-embarques').textContent = totalEmbarques;
        document.getElementById('total-dias-mar').textContent = totalDiasMar;
        document.getElementById('total-dias-casa').textContent = (24 * 30) - totalDiasMar;

        this.atualizarGraficos();
    }

    renderTimeline(timeline) {
        const container = document.getElementById('timeline-2anos');
        container.innerHTML = '';
        
        timeline.forEach((mes, index) => {
            const monthDiv = document.createElement('div');
            monthDiv.className = 'timeline-month';
            
            const header = document.createElement('div');
            header.className = 'month-header';
            header.textContent = mes.mes;
            
            const days = document.createElement('div');
            days.className = 'month-days';
            
            mes.dias.forEach(dia => {
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
        container.innerHTML = '';
        
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const anos = [2025, 2026];
        
        anos.forEach(ano => {
            meses.forEach((mes, index) => {
                const monthDiv = document.createElement('div');
                monthDiv.className = 'mini-month';
                
                const title = document.createElement('h4');
                title.textContent = `${mes}/${ano}`;
                
                const days = document.createElement('div');
                days.className = 'mini-days';
                
                // Simular alguns dias
                for (let i = 1; i <= 30; i++) {
                    const day = document.createElement('div');
                    day.className = 'day-block';
                    if (i <= 15) day.className += ' embarcado';
                    days.appendChild(day);
                }
                
                monthDiv.appendChild(title);
                monthDiv.appendChild(days);
                container.appendChild(monthDiv);
            });
        });
    }

    // ============ ESTATÍSTICAS E GRÁFICOS ============
    atualizarEstatisticas() {
        this.atualizarGraficos();
        this.gerarResumoAnual();
    }

    atualizarGraficos() {
        this.atualizarGraficoEmbarques();
        this.atualizarGraficoProjecao();
    }

    atualizarGraficoEmbarques() {
        const ctx = document.getElementById('embarqueChart').getContext('2d');
        
        if (this.embarqueChart) {
            this.embarqueChart.destroy();
        }

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const dados = meses.map(() => Math.floor(Math.random() * 20) + 10); // Simulado

        this.embarqueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Dias Embarcados por Mês',
                    data: dados,
                    borderColor: '#2196F3',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    atualizarGraficoProjecao() {
        const ctx = document.getElementById('projecaoChart').getContext('2d');
        
        if (this.projecaoChart) {
            this.projecaoChart.destroy();
        }

        this.projecaoChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Dias no Mar', 'Dias em Casa'],
                datasets: [{
                    data: [
                        this.usuarioAtual?.estatisticas?.totalDiasMar || 360,
                        this.usuarioAtual?.estatisticas?.totalDiasCasa || 360
                    ],
                    backgroundColor: ['#F44336', '#4CAF50'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    gerarResumoAnual() {
        const container = document.getElementById('resumo-anual');
        const anos = [2025, 2026];
        
        let html = '<div class="resumo-grid">';
        anos.forEach(ano => {
            html += `
                <div class="resumo-ano">
                    <h4>${ano}</h4>
                    <p>Embarques: 24</p>
                    <p>Dias no mar: 180</p>
                    <p>Dias em casa: 185</p>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    // ============ CALENDÁRIO ============
    inicializarCalendario() {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = '';

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
            },
            events: this.gerarEventosComProjecao(),
            eventColor: '#F44336',
            eventTextColor: 'white',
            height: 'auto',
            contentHeight: 'auto'
        });

        this.calendar.render();
    }

    gerarEventosComProjecao() {
        const eventos = [];
        
        if (this.usuarioAtual?.configuracoes?.nextEmbarqueDate && this.usuarioAtual?.configuracoes?.diasEmbarcado) {
            const startDate = new Date(this.usuarioAtual.configuracoes.nextEmbarqueDate);
            const dias = this.usuarioAtual.configuracoes.diasEmbarcado;
            
            // Projetar 24 meses
            for (let ciclo = 0; ciclo < 24; ciclo++) {
                const cicloDate = new Date(startDate);
                cicloDate.setMonth(startDate.getMonth() + ciclo);
                
                // Evento do primeiro dia (azul)
                eventos.push({
                    title: '🚢 Embarque',
                    start: cicloDate.toISOString().split('T')[0],
                    color: '#2196F3',
                    textColor: 'white'
                });

                // Dias embarcados (vermelho)
                for (let i = 0; i < dias; i++) {
                    const eventDate = new Date(cicloDate);
                    eventDate.setDate(cicloDate.getDate() + i);
                    
                    eventos.push({
                        title: '⚓ Embarcado',
                        start: eventDate.toISOString().split('T')[0],
                        color: '#F44336',
                        textColor: 'white'
                    });
                }
            }
        }

        return eventos;
    }

    // ============ CONFIGURAÇÕES ============
    salvarConfiguracaoEmbarque() {
        const nextDate = document.getElementById('next-embarque-date').value;
        const dias = parseInt(document.getElementById('dias-embarcado').value);

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
            this.showToast('Configuração salva com sucesso!', 'success');
            return true;
        }
        return false;
    }

    atualizarPerfil() {
        const nome = document.getElementById('profile-fullname').value;
        const senha = document.getElementById('profile-password').value;

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
            localStorage.setItem('ultimoUsuario', JSON.stringify(this.usuarioAtual));
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
        a.download = `embarques-backup-${this.usuarioAtual.username}.json`;
        a.click();
        
        this.showToast('Backup exportado!', 'success');
    }

    // ============ UI UTILS ============
    toggleSidebar() {
        document.getElementById('sidebar').classList.add('active');
        document.getElementById('sidebar-overlay').classList.add('active');
    }

    closeSidebar() {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }

    toggleUserMenu() {
        // Implementar menu de usuário rápido
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        
        let bgColor = '#263238';
        if (type === 'success') bgColor = '#4CAF50';
        if (type === 'error') bgColor = '#F44336';
        toast.style.background = bgColor;
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Instância global
const sistema = new SistemaEmbarquesAndroid();

// ============ FUNÇÕES GLOBAIS ============
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tabName === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const fullname = document.getElementById('reg-fullname').value;

    if (username && password && fullname) {
        if (sistema.registrarUsuario(username, password, fullname)) {
            showTab('login');
        }
    } else {
        sistema.showToast('Preencha todos os campos!', 'error');
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (sistema.login(username, password)) {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    }
}

function logout() {
    sistema.logout();
}

function showPage(pageName) {
    // Atualizar menu
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Atualizar páginas
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // Atualizar bottom nav
    const navItems = document.querySelectorAll('.nav-item');
    if (pageName === 'calendar') navItems[0].classList.add('active');
    if (pageName === 'projecao') navItems[1].classList.add('active');
    if (pageName === 'estatisticas') navItems[2].classList.add('active');
    if (pageName === 'config') navItems[3].classList.add('active');
    
    // Atualizar sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-menu .menu-item');
    sidebarItems.forEach(item => {
        if (item.querySelector('span')?.textContent.toLowerCase().includes(pageName)) {
            item.classList.add('active');
        }
    });
    
    // Recarregar dados conforme página
    if (pageName === 'projecao') {
        sistema.calcularProjecao2Anos();
        sistema.gerarMiniCalendario();
    }
    if (pageName === 'estatisticas') {
        sistema.atualizarEstatisticas();
    }
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
});
