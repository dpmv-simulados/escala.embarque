// Sistema de Usuários e Calendário de Embarques
class SistemaEmbarques {
    constructor() {
        this.calendar = null;
        this.usuarioAtual = null;
        this.init();
    }

    init() {
        // Inicializa o localStorage com dados padrão se vazio
        if (!localStorage.getItem('usuarios')) {
            localStorage.setItem('usuarios', JSON.stringify([]));
        }

        // Adiciona listener para salvar dados antes de fechar
        window.addEventListener('beforeunload', () => {
            if (this.usuarioAtual) {
                this.salvarDadosUsuario();
            }
        });
    }

    // Registro de novo usuário
    registrarUsuario(username, password, fullname) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        
        // Verifica se usuário já existe
        if (usuarios.find(u => u.username === username)) {
            alert('Usuário já existe!');
            return false;
        }

        const novoUsuario = {
            id: Date.now().toString(),
            username: username,
            password: password,
            fullname: fullname,
            configuracoes: {
                nextEmbarqueDate: null,
                diasEmbarcado: null
            },
            createdAt: new Date().toISOString()
        };

        usuarios.push(novoUsuario);
        localStorage.setItem('usuarios', JSON.stringify(usuarios));
        alert('Usuário cadastrado com sucesso!');
        return true;
    }

    // Login de usuário
    login(username, password) {
        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const usuario = usuarios.find(u => u.username === username && u.password === password);
        
        if (usuario) {
            this.usuarioAtual = usuario;
            this.atualizarInterfaceUsuario();
            return true;
        }
        return false;
    }

    // Atualiza interface com dados do usuário
    atualizarInterfaceUsuario() {
        if (this.usuarioAtual) {
            document.getElementById('user-name').textContent = this.usuarioAtual.fullname || this.usuarioAtual.username;
            document.getElementById('user-login').textContent = `@${this.usuarioAtual.username}`;
            document.getElementById('current-user-badge').innerHTML = `<i class="fas fa-user"></i> ${this.usuarioAtual.fullname || this.usuarioAtual.username}`;
            
            // Preenche dados do perfil
            document.getElementById('profile-fullname').value = this.usuarioAtual.fullname || '';
            document.getElementById('profile-username').value = this.usuarioAtual.username;
            
            // Carrega configurações salvas
            if (this.usuarioAtual.configuracoes) {
                if (this.usuarioAtual.configuracoes.nextEmbarqueDate) {
                    document.getElementById('next-embarque-date').value = this.usuarioAtual.configuracoes.nextEmbarqueDate;
                }
                if (this.usuarioAtual.configuracoes.diasEmbarcado) {
                    document.getElementById('dias-embarcado').value = this.usuarioAtual.configuracoes.diasEmbarcado;
                }
            }
            
            this.inicializarCalendario();
        }
    }

    // Salva configurações do usuário
    salvarConfiguracaoEmbarque() {
        const nextDate = document.getElementById('next-embarque-date').value;
        const dias = parseInt(document.getElementById('dias-embarcado').value);

        if (!nextDate || !dias) {
            alert('Preencha todos os campos!');
            return false;
        }

        // Salva no usuário atual
        if (this.usuarioAtual) {
            this.usuarioAtual.configuracoes = {
                nextEmbarqueDate: nextDate,
                diasEmbarcado: dias
            };

            // Atualiza no localStorage
            const usuarios = JSON.parse(localStorage.getItem('usuarios'));
            const index = usuarios.findIndex(u => u.id === this.usuarioAtual.id);
            if (index !== -1) {
                usuarios[index] = this.usuarioAtual;
                localStorage.setItem('usuarios', JSON.stringify(usuarios));
            }

            this.atualizarCalendario();
            return true;
        }
        return false;
    }

    // Atualiza perfil do usuário
    atualizarPerfil(nome, senha) {
        if (nome) {
            this.usuarioAtual.fullname = nome;
        }
        
        if (senha) {
            this.usuarioAtual.password = senha;
        }

        const usuarios = JSON.parse(localStorage.getItem('usuarios'));
        const index = usuarios.findIndex(u => u.id === this.usuarioAtual.id);
        if (index !== -1) {
            usuarios[index] = this.usuarioAtual;
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            alert('Perfil atualizado com sucesso!');
            this.atualizarInterfaceUsuario();
        }
    }

    // Inicializa o calendário
    inicializarCalendario() {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = '';

        this.calendar = new FullCalendar.Calendar(calendarEl, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek,dayGridDay'
            },
            events: this.gerarEventosEmbarque(),
            eventColor: '#ff6b6b',
            eventTextColor: 'white'
        });

        this.calendar.render();
    }

    // Gera eventos baseados na configuração
    gerarEventosEmbarque() {
        const eventos = [];

        if (this.usuarioAtual?.configuracoes?.nextEmbarqueDate && this.usuarioAtual?.configuracoes?.diasEmbarcado) {
            const startDate = new Date(this.usuarioAtual.configuracoes.nextEmbarqueDate);
            const dias = this.usuarioAtual.configuracoes.diasEmbarcado;

            // Evento do primeiro dia (azul)
            eventos.push({
                title: '🚢 Início do Embarque',
                start: startDate.toISOString().split('T')[0],
                color: '#4dabf7',
                textColor: 'white'
            });

            // Eventos dos dias embarcados (vermelho)
            for (let i = 0; i < dias; i++) {
                const eventDate = new Date(startDate);
                eventDate.setDate(startDate.getDate() + i);
                
                eventos.push({
                    title: '⚓ Embarcado',
                    start: eventDate.toISOString().split('T')[0],
                    color: '#ff6b6b',
                    textColor: 'white'
                });
            }
        }

        return eventos;
    }

    // Atualiza calendário
    atualizarCalendario() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.gerarEventosEmbarque());
        }
    }

    // Logout
    logout() {
        if (this.usuarioAtual) {
            this.salvarDadosUsuario();
            this.usuarioAtual = null;
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('hidden');
        }
    }

    // Salva dados do usuário atual
    salvarDadosUsuario() {
        if (this.usuarioAtual) {
            const usuarios = JSON.parse(localStorage.getItem('usuarios'));
            const index = usuarios.findIndex(u => u.id === this.usuarioAtual.id);
            if (index !== -1) {
                usuarios[index] = this.usuarioAtual;
                localStorage.setItem('usuarios', JSON.stringify(usuarios));
            }
        }
    }
}

// Instância global do sistema
const sistema = new SistemaEmbarques();

// Funções de UI
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tabName === 'login') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

function register() {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const fullname = document.getElementById('reg-fullname').value;

    if (username && password && fullname) {
        sistema.registrarUsuario(username, password, fullname);
        showTab('login');
    } else {
        alert('Preencha todos os campos!');
    }
}

function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    if (sistema.login(username, password)) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
    } else {
        alert('Usuário ou senha inválidos!');
    }
}

function logout() {
    sistema.logout();
}

function showPage(pageName) {
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    if (pageName === 'calendar') {
        document.querySelector('.menu-item:first-child').classList.add('active');
        document.getElementById('calendar-page').classList.add('active');
        sistema.atualizarCalendario();
    } else {
        document.querySelectorAll('.menu-item')[1].classList.add('active');
        document.getElementById('config-page').classList.add('active');
    }
}

function salvarConfiguracao() {
    if (sistema.salvarConfiguracaoEmbarque()) {
        alert('Configuração salva com sucesso!');
    }
}

function atualizarPerfil() {
    const nome = document.getElementById('profile-fullname').value;
    const senha = document.getElementById('profile-password').value;
    sistema.atualizarPerfil(nome, senha);
    document.getElementById('profile-password').value = '';
}

// Inicializa
document.addEventListener('DOMContentLoaded', function() {
    showTab('login');
});
