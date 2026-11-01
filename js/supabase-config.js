const URL_SUPABASE = 'https://olpsktkbkcuukcvndxed.supabase.co';
const CLAVE_ANONIMA = 'sb_publishable_0TOGMtkz6KfYmVWPoQCS4Q_yztjqT3E';
const supabaseCliente = supabase.createClient(URL_SUPABASE, CLAVE_ANONIMA, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: false
    }
});

// Si el administrador suspendió la cuenta, se cierra la sesión y se avisa en el login.
(async () => {
    try {
        const { data: { session } } = await supabaseCliente.auth.getSession();

        if (!session) {
            return;
        }

        const { data } = await supabaseCliente.rpc('mi_suspension');
        const suspension = data && data[0];

        if (suspension) {
            await supabaseCliente.auth.signOut();
            sessionStorage.setItem('aquatrack_suspension', JSON.stringify(suspension));
            window.location.href = 'login.html';
        }
    } catch {
        // Si no se puede comprobar, no se bloquea a nadie.
    }
})();