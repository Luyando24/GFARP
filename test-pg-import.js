import pkg from 'pg';
console.log('pkg:', pkg);
try {
    const { Pool } = pkg;
    console.log('Pool from pkg:', Pool);
} catch (e) {
    console.error('Error destructuring Pool from pkg:', e);
}

import * as pgStar from 'pg';
console.log('pgStar:', pgStar);
try {
    const { Pool } = pgStar;
    console.log('Pool from pgStar:', Pool);
} catch (e) {
    console.error('Error destructuring Pool from pgStar:', e);
}

import pgDefault from 'pg';
console.log('pgDefault:', pgDefault);
try {
    const { Pool } = pgDefault;
    console.log('Pool from pgDefault:', Pool);
} catch (e) {
    console.error('Error destructuring Pool from pgDefault:', e);
}
