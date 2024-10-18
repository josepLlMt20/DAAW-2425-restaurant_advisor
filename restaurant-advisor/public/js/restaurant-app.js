import { content } from './modules/test';
import typeAhead from './modules/typeAhead'; 

typeAhead(document.querySelector('.form-inline'));
console.log('It works!');
console.log(content);

