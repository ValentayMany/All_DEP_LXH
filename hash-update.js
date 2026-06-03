require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./server/supabase');

const users = [
  { username: 'ST',    password: 'ST1234'   },
  { username: 'admin', password: 'admin1234' },
  { username: 'FN',    password: 'FN1234'   },
  { username: 'DC',    password: 'DC1234'   },
  { username: 'HR',    password: 'HR1234'   },
  { username: 'MK',    password: 'MK1234'   },
  { username: 'AD',    password: 'ADM1234'  },
  { username: 'IT',    password: 'IT1234'   },
];

async function run() {
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const { error } = await supabase
      .from('users')
      .update({ password: hash })
      .eq('username', u.username);
    if (error) console.log(`❌ ${u.username}: ${error.message}`);
    else console.log(`✅ ${u.username} updated`);
  }
}

run();