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
            localStorage.setItem('usuarios', JSON.stringify([]));
        }
        
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
            document.getElementById('auth-screen').style.display = 'none';
            document.getElementById('dashboard').classList.add('active');
            this.atualizarInterfaceUsuario();
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
            document.getElementById('auth-screen').style.display = 'flex';
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
            
            setTimeout(() => {
                this.inicializarCalendario();
                this.calcularProjecao2Anos();
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
        
        document.getElementById('total-embarques').textContent = totalEmbarques;
        document.getElementById('total-dias-mar').textContent = totalDiasMar;
        document.getElementById('total-dias-casa').textContent = (24 * 30) - totalDiasMar;

        this.atualizarGraficos();
        this.gerarMiniCalendario();
    }

    renderTimeline(timeline) {
        const container = document.getElementById('timeline-2anos');
        if (!container) return;
        
        container.innerHTML = '';
        
        timeline.forEach((mes) => {
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
        const anos = [2025, 2026];
        
        anos.forEach(ano => {
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
                    if (i < 15) day.classList.add('embarcado');
                    days.appendChild(day);
                }
                
                monthDiv.appendChild(title);
                monthDiv.appendChild(days);
                container.appendChild(monthDiv);
            });
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
            
            for (let ciclo = 0; ciclo < 6; ciclo++) {
                const cicloDate = new Date(startDate);
                cicloDate.setMonth(startDate.getMonth() + ciclo);
                
                eventos.push({
                    title: '🚢 Início',
                    start: cicloDate.toISOString().split('T')[0],
                    color: '#2196F3',
                    textColor: 'white'
                });

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
        const ctx = document.getElementById('embarqueChart')?.getContext('2d');
        if (!ctx) return;
        
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
        const ctx = document.getElementById('projecaoChart')?.getContext('2d');
        if (!ctx) return;
        
        if (this.projecaoChart) {
            this.projecaoChart.destroy();
        }

        const diasMar = this.usuarioAtual?.estatisticas?.totalDiasMar || 360;
        const diasCasa = this.usuarioAtual?.estatisticas?.totalDiasCasa || 360;

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
        
        let html = '';
        anos.forEach(ano => {
            html += `
                <div class="resumo-ano">
                    <h4>${ano}</h4>
                    <p>Embarques: 12</p>
                    <p>Dias no mar: ${diasEmbarcado * 12}</p>
                    <p>Dias em casa: ${365 - (diasEmbarcado * 12)}</p>
                </div>
            `;
        });
        
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
        a.download = `embarques-${this.usuarioAtual.username}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showToast('Backup exportado!', 'success');
    }

    // ============ UI UTILS ============
    toggleSidebar() {
        document.getElementById('sidebar')?.classList.add('active');
        document.getElementById('sidebar-overlay')?.classList.add('active');
    }

    closeSidebar() {
        document.getElementById('sidebar')?.classList.remove('active');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
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
        tabs[0]?.classList.add('active');
        document.getElementById('login-form')?.classList.add('active');
    } else {
        tabs[1]?.classList.add('active');
        document.getElementById('register-form')?.classList.add('active');
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

    if (sistema.login(username, password)) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    }
}

function logout() {
    sistema.logout();
}

function showPage(pageName) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    document.getElementById(`${pageName}-page`)?.classList.add('active');
    
    const navItems = document.querySelectorAll('.nav-item');
    if (pageName === 'calendar') navItems[0]?.classList.add('active');
    if (pageName === 'projecao') navItems[1]?.classList.add('active');
    if (pageName === 'estatisticas') navItems[2]?.classList.add('active');
    if (pageName === 'config') navItems[3]?.classList.add('active');
    
    if (pageName === 'projecao') {
        setTimeout(() => {
            sistema.calcularProjecao2Anos();
            sistema.gerarMiniCalendario();
        }, 100);
    }
    if (pageName === 'estatisticas') {
        setTimeout(() => {
            sistema.atualizarEstatisticas();
        }, 100);
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
