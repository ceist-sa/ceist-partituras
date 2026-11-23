/// <reference types="bun" />
import { expect, test } from 'bun:test';
import { instrumentsOf, partLabel, partName, voicesOf } from './parts';

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
		'trompa clarinete'
	]);
	expect(read('Grieg - Suite Holberg - VIOLA (VIOLIN - TRANSPOSED).pdf', 'Grieg - Suite Holberg')).toEqual(['Viola (Violino, transposto)', 'viola violino']);
	expect(read('DOUBLE BASS (CELLO V1) - Freitas Branco - A morte de Manfred.pdf', 'Freitas Branco - A morte de Manfred')).toEqual([
		'Contrabaixo (Violoncelo versão 1)',
		'contrabaixo violoncelo'
	]);
});

test('older names', () => {
	expect(read('VIOLINO1-COM-OBOES-3-E-4-Oratoria-de-Natal-Bach-10-Sinfonia.pdf', 'Bach - Oratória de Natal')).toEqual(['Violino I com Oboés III e IV', 'violino oboe']);
	expect(read('OBOÉ1 - Mozart - Sinfonia 40 - VERSAO2.pdf', 'Mozart - Sinfonia 40')).toEqual(['Oboé I, versão 2', 'oboe']);
	expect(read('CELLO & BASSOON - Bach - Brandenburg .pdf', 'Bach - Brandenburg 2')).toEqual(['Violoncelo e Fagote', 'violoncelo fagote']);
	expect(read('inverno_arranjo_ceist-Bb_Clarinet.pdf', 'Vivaldi - Inverno')).toEqual(['Clarinete em Sib', 'clarinete']);
	expect(read('inverno_arranjo_ceist.pdf', 'Vivaldi - Inverno')).toEqual(['Partitura geral', 'geral']);
	expect(read('ARCOS - Mozart - Requiem.pdf', 'Mozart - Requiem')).toEqual(['Arcos', 'violino viola violoncelo contrabaixo']);
});

test('instruments of a symphony orchestra', () => {
	expect(read('BASS CLARINET - X - Y.pdf', 'X - Y')).toEqual(['Clarinete baixo', 'clarinete']);
	expect(read('CONTRABASSOON - X - Y.pdf', 'X - Y')).toEqual(['Contrafagote', 'fagote']);
	expect(read('ENGLISH HORN - X - Y.pdf', 'X - Y')).toEqual(['Corne inglês', 'oboe']);
	expect(read('HORN III F - X - Y.pdf', 'X - Y')).toEqual(['Trompa III em Fá', 'trompa']);
	expect(read('BASS TROMBONE - X - Y.pdf', 'X - Y')).toEqual(['Trombone baixo', 'trombone']);
	expect(read('TUBA - X - Y.pdf', 'X - Y')).toEqual(['Tuba', 'tuba']);
	expect(read('TIMPANI - X - Y.pdf', 'X - Y')).toEqual(['Tímpanos', 'percussao']);
	expect(read('BASS DRUM & CYMBALS - X - Y.pdf', 'X - Y')).toEqual(['Bombo e Pratos', 'percussao']);
	expect(read('HARP - X - Y.pdf', 'X - Y')).toEqual(['Harpa', 'harpa']);
	expect(read('HARPSICHORD - X - Y.pdf', 'X - Y')).toEqual(['Cravo', 'teclas']);
	expect(read('CLARINET II A - X - Y.pdf', 'X - Y')).toEqual(['Clarinete II em Lá', 'clarinete']);
});

test('voices', () => {
	expect(voicesOf('VIOLIN II', 'violino')).toEqual([2]);
	expect(voicesOf('FLUTE I & II', 'flauta')).toEqual([1, 2]);
	expect(voicesOf('FLAUTA I, II', 'flauta')).toEqual([1, 2]);
	expect(voicesOf('VIOLINO1 COM OBOES 3 E 4', 'violino')).toEqual([1]);
	expect(voicesOf('VIOLINO1 COM OBOES 3 E 4', 'oboe')).toEqual([3, 4]);
	expect(voicesOf('TRUMPET I Bb', 'trompete')).toEqual([1]);
	// The horn's number says nothing about which clarinet takes the part
	expect(voicesOf('FRENCH HORN I (CLARINET Bb)', 'clarinete')).toEqual([]);
	expect(voicesOf('FRENCH HORN I (CLARINET Bb)', 'trompa')).toEqual([1]);
	expect(voicesOf('VIOLA (VIOLIN - TRANSPOSED)', 'violino')).toEqual([]);
	expect(voicesOf('DOUBLE BASS (CELLO V1)', 'violoncelo')).toEqual([]);
});
