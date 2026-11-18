/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { instrumentsOf, partLabel, partName } from './parts';

const read = (file: string, folder: string) => {
	const label = partLabel(file, folder);
	return [partName(label), instrumentsOf(label).join(' ')];
};

test('the convention: INSTRUMENT - Composer - Work', () => {
	expect(read('VIOLIN II - Fauré - Pavane.pdf', 'Fauré - Pavane')).toEqual(['Violino II', 'violino']);
	expect(read('DOUBLE BASS - Rossini - Il signor Bruschino.pdf.pdf', 'Rossini - Il signor Bruschino')).toEqual(['Contrabaixo', 'contrabaixo']);
	expect(read('CONDUCTOR A3 - Bach - Magnificat.pdf', 'Bach - Magnificat')).toEqual(['Partitura geral A3', 'geral']);
});

test('a part in brackets is for both instruments', () => {
	expect(read('FRENCH HORN I (CLARINET Bb) - Casadesus - Concerto em Dó menor.pdf', 'Casadesus - Concerto em Dó menor')).toEqual([
		'Trompa I (Clarinete em Sib)',
		'clarinete trompa'
	]);
	expect(read('Grieg - Suite Holberg - VIOLA (VIOLIN - TRANSPOSED).pdf', 'Grieg - Suite Holberg')).toEqual(['Viola (Violino, transposto)', 'violino viola']);
	expect(read('DOUBLE BASS (CELLO V1) - Freitas Branco - A morte de Manfred.pdf', 'Freitas Branco - A morte de Manfred')).toEqual([
		'Contrabaixo (Violoncelo versão 1)',
		'violoncelo contrabaixo'
	]);
});

test('older names', () => {
	expect(read('VIOLINO1-COM-OBOES-3-E-4-Oratoria-de-Natal-Bach-10-Sinfonia.pdf', 'Bach - Oratória de Natal')).toEqual(['Violino I com Oboés III e IV', 'oboe violino']);
	expect(read('OBOÉ1 - Mozart - Sinfonia 40 - VERSAO2.pdf', 'Mozart - Sinfonia 40')).toEqual(['Oboé I, versão 2', 'oboe']);
	expect(read('CELLO & BASSOON - Bach - Brandenburg .pdf', 'Bach - Brandenburg 2')).toEqual(['Violoncelo e Fagote', 'fagote violoncelo']);
	expect(read('inverno_arranjo_ceist-Bb_Clarinet.pdf', 'Vivaldi - Inverno')).toEqual(['Clarinete em Sib', 'clarinete']);
	expect(read('inverno_arranjo_ceist.pdf', 'Vivaldi - Inverno')).toEqual(['Partitura geral', 'geral']);
	expect(read('ARCOS - Mozart - Requiem.pdf', 'Mozart - Requiem')).toEqual(['Arcos', 'violino viola violoncelo contrabaixo']);
});
