import React, { useEffect, useReducer } from 'react'
import { LangStateContext } from '@store/create'
import { langInitialState } from '@store/initialState'
import { langReducer } from '@store/reducer'
import { getLocale, i18nChangeLanguage } from '@lang/i18n'

export function LangProvider({ children }) {
	const [langState, langDispatch] = useReducer(langReducer, langInitialState)

	/*
	 * 기본 언어 설정
	 */
	useEffect(() => {
		langDispatch({
			type: 'SET_LANG',
			payload: getLocale(),
		})

		i18nChangeLanguage(getLocale())
	}, [])

	return <LangStateContext.Provider value={{ langState, langDispatch }}>{children}</LangStateContext.Provider>
}