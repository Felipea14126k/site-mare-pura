Para criar a senha de acesso do admin precisa ser executado esse comando no terminal
node -e "const {scryptSync,randomBytes}=require('node:crypto');const s=randomBytes(16);const h=scryptSync('AQUI_VAI_SUA_SENHA_SUPER_SECRETA',s,64);console.log('ADMIN_SENHA_HASH='+s.toString('hex')+':'+h.toString('hex'))"
para iniciar o programa com sua senha funcionando precisa ser esse
set ADMIN_EMAIL=admin@marepura.com & set ADMIN_SENHA_HASH=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789 & npm run dev -- --host
