import {Injectable, inject, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {catchError, of} from 'rxjs';
import type {TestCase, TestCaseIndexEntry} from '../models/test-case.interfaces';

@Injectable({providedIn: 'root'})
export class TestCaseService {
	private readonly http = inject(HttpClient);

	readonly index = signal<TestCaseIndexEntry[]>([]);
	readonly loading = signal(false);

	/**
	 * Fetch assets/test-cases/index.json and populate the index signal.
	 * A 404 (folder not yet populated) is silently treated as an empty list.
	 */
	loadIndex():void {
		this.http
			.get<TestCaseIndexEntry[]>('assets/test-cases/index.json')
			.pipe(catchError(() => of([] as TestCaseIndexEntry[])))
			.subscribe(entries => this.index.set(entries));
	}

	/**
	 * Fetch a single test case file by ID and return it.
	 * Callers subscribe and handle errors themselves.
	 */
	loadTestCase(id:string) {
		this.loading.set(true);
		return this.http
			.get<TestCase>(`assets/test-cases/${id}.json`)
			.pipe(catchError(() => of(null)));
	}
}
