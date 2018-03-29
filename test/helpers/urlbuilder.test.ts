/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
"use strict";

import { assert } from "chai";

import { UrlBuilder } from "../../src/helpers/urlbuilder";

describe("UrlBuilder", function() {

    beforeEach(function() {
        //
    });

    it("should ensure undefined baseUrl returns undefined", function() {
        const url: string = undefined;

        const result: string = UrlBuilder.Join(url);
        assert.isUndefined(result);
    });

    it("should ensure baseUrl with trailing slash returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com/";

        const result: string = UrlBuilder.Join(url);
        assert.equal(url, result);
    });

    it("should ensure baseUrl without trailing slash returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com";

        const result: string = UrlBuilder.Join(url);
        assert.equal(url, result);
    });

    it("should ensure baseUrl with trailing slash and undefined args returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com/";

        const result: string = UrlBuilder.Join(url, undefined);
        assert.equal(url, result);
    });

    it("should ensure baseUrl without trailing slash and undefined args returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com";

        const result: string = UrlBuilder.Join(url, undefined);
        assert.equal(url, result);
    });

    it("should ensure baseUrl with trailing slash and empty args returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com/";
        const args: string = "";

        const result: string = UrlBuilder.Join(url, args);
        assert.equal(url, result);
    });

    it("should ensure baseUrl without trailing slash and empty args returns the original url", function() {
        const url: string = "http://xplatalm.visualstudio.com";
        const args: string = "";

        const result: string = UrlBuilder.Join(url, args);
        assert.equal(url, result);
    });

    //Single path argument
    it("should ensure baseUrl with trailing slash and single arg returns the proper url", function() {
        const url: string = "http://xplatalm.visualstudio.com/";
        const args: string = "_build";

        const result: string = UrlBuilder.Join(url, args);
        assert.equal(`${url}${args}`, result);
    });

    it("should ensure baseUrl without trailing slash and single arg returns the proper url", function() {
        const url: string = "http://xplatalm.visualstudio.com";
        const args: string = "_build";

        const result: string = UrlBuilder.Join(url, args);
        assert.equal(`${url}/${args}`, result);
    });

    //Multiple path arguments
    it("should ensure baseUrl with trailing slash and multiple args returns the proper url", function() {
        const url: string = "http://xplatalm.visualstudio.com/";

        const result: string = UrlBuilder.Join(url, "_build", "index", "buildId=42");
        assert.equal(`${url}_build/index/buildId=42`, result);
    });

    it("should ensure baseUrl without trailing slash and multiple args returns the proper url", function() {
        const url: string = "http://xplatalm.visualstudio.com";

        const result: string = UrlBuilder.Join(url, "_build", "index", "buildId=42");
        assert.equal(`${url}/_build/index/buildId=42`, result);
    });

    it("should ensure baseUrl and multiple args and various leading slashes returns the proper url", function() {
        const url: string = "http://xplatalm.visualstudio.com";

        const result: string = UrlBuilder.Join(url, "/_build", "/index", "/buildId=42");
        assert.equal(`${url}/_build/index/buildId=42`, result);
    });

    /* AddQueryParams */
    it("should ensure AddQueryParams supports undefined baseUrl", function() {
        const url: string = undefined;

        const result: string = UrlBuilder.AddQueryParams(url);
        assert.isUndefined(result);
    });

    it("should ensure AddQueryParams supports baseUrl with no query params", function() {
        const url: string = "http://xplatalm.visualstudio.com/index";

        const result: string = UrlBuilder.AddQueryParams(url);
        assert.equal(url, result);
    });

    it("should ensure AddQueryParams supports baseUrl with trailing slash and single query params", function() {
        const url: string = "http://xplatalm.visualstudio.com/index/";

        const result: string = UrlBuilder.AddQueryParams(url, "buildId=42");
        assert.equal("http://xplatalm.visualstudio.com/index?buildId=42", result);
    });

    it("should ensure AddQueryParams supports single query parameter", function() {
        const url: string = "http://xplatalm.visualstudio.com/index";

        let result: string = UrlBuilder.AddQueryParams(url, "buildId=42");
        assert.equal(`${url}?buildId=42`, result);
        //Test with leading "?"
        result = UrlBuilder.AddQueryParams(url, "?buildId=42");
        assert.equal(`${url}?buildId=42`, result);
        //Test with leading "&" (which is incorrect in this case of a single query parameter)
        result = UrlBuilder.AddQueryParams(url, "&buildId=42");
        assert.equal(`${url}?buildId=42`, result);
    });

    it("should ensure AddQueryParams supports multiple query parameters", function() {
        const url: string = "http://xplatalm.visualstudio.com/index";

        let result: string = UrlBuilder.AddQueryParams(url, "buildId=42", "whatever=andever", "foo=bar");
        assert.equal(`${url}?buildId=42&whatever=andever&foo=bar`, result);
        //Test with leading "&"
        result = UrlBuilder.AddQueryParams(url, "buildId=42", "whatever=andever", "foo=bar");
        assert.equal(`${url}?buildId=42&whatever=andever&foo=bar`, result);
        //Test with leading "&" (which aren't needed when using this class)
        result = UrlBuilder.AddQueryParams(url, "buildId=42", "&whatever=andever", "&foo=bar");
        assert.equal(`${url}?buildId=42&whatever=andever&foo=bar`, result);
    });

    /* AddHashes */
    it("should ensure AddHashes supports undefined baseUrl and undefined arg", function() {
        let url: string = undefined;
        const arg: string = undefined;

        let result: string = UrlBuilder.AddHashes(url, arg);
        assert.isUndefined(result);
        url = "http://xplatalm.visualstudio.com";
        result = UrlBuilder.AddHashes(url, arg);
        assert.equal(url, result);
    });

    it("should ensure AddHashes supports url with trailing slash", function() {
        const url: string = "http://xplatalm.visualstudio.com/";
        const arg: string = "#path";

        const result: string = UrlBuilder.AddHashes(url, arg);
        assert.equal(`http://xplatalm.visualstudio.com${arg}`, result);
    });

    it("should ensure AddHashes supports single arg with or without leading #", function() {
        const url: string = "http://xplatalm.visualstudio.com";
        let arg: string = "#path";

        let result: string = UrlBuilder.AddHashes(url, arg);
        assert.equal(`${url}${arg}`, result);
        arg = "path";
        result = UrlBuilder.AddHashes(url, arg);
        assert.equal(`${url}#${arg}`, result);
    });

    it("should ensure AddHashes supports multiple arg with or without leading #", function() {
        const url: string = "http://xplatalm.visualstudio.com";

        let result: string = UrlBuilder.AddHashes(url, "path", "file");
        assert.equal(`${url}#path&file`, result);

        result = UrlBuilder.AddHashes(url, "#path", "&file");
        assert.equal(`${url}#path&file`, result);
    });

    /* Combined function calls */
    it("should ensure combined function calls work as expected", function() {
        const url: string = "http://xplatalm.visualstudio.com/_build";

        let result: string = UrlBuilder.Join(url, "index");
        result = UrlBuilder.AddQueryParams(result, "buildId=42", "_a=summary");
        assert.equal(`${url}/index?buildId=42&_a=summary`, result);

        result = UrlBuilder.AddHashes(url, "_a=completed");
        assert.equal(`${url}#_a=completed`, result);

        result = UrlBuilder.AddHashes(url, "_a=completed", "definitionId=42");
        assert.equal(`${url}#_a=completed&definitionId=42`, result);
    });
});
