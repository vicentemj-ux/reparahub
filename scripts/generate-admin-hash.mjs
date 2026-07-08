import bcryptjs from 'bcryptjs';

const password = '0305201001';
const hash = await bcryptjs.hash(password, 12);
console.log(`UPDATE public.taller_users SET password_hash = '${hash}' WHERE email = 'vicentemj@gmail.com';`);
